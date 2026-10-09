"""Pipeline de 3 etapas -> zona VERDE / AMARILLA / ROJA (Sin columna concepto)."""
from __future__ import annotations
from collections import Counter
from dataclasses import dataclass, field

from matcher import Padron
from Normalizador import normalize_boleta

VERDE, AMARILLA, ROJA = "VERDE", "AMARILLA", "ROJA"
MIN_COVERAGE_VERDE = 2

@dataclass
class Config:
    tarifa: float                       
    tolerancia_monto: float = 0.0

@dataclass
class Resultado:
    boleta: str
    zona: str
    carnet_asignado: str | None
    motivo: str
    candidatos: list[dict] = field(default_factory=list)
    k: int | None = None

    def datos_extra(self) -> dict:
        return {
            "motivo": self.motivo,
            "k": self.k,
            "candidatos": self.candidatos,
            "pipeline": "dev1-v2",
        }

def contar_boletas(pagos: list[dict]) -> Counter:
    return Counter(normalize_boleta(p.get("boleta")) for p in pagos)

def clasificar_pago(pago: dict, padron: Padron, cfg: Config, boletas: Counter) -> Resultado:
    boleta = normalize_boleta(pago.get("boleta"))

    # ---- Etapa 1: integridad contable ------------------------------------
    if not boleta:
        return Resultado(boleta, ROJA, None, "boleta_vacia")
    if boletas[boleta] > 1:
        return Resultado(boleta, ROJA, None, "boleta_duplicada")
    try:
        monto = float(str(pago.get("monto", 0)).replace(",", "").replace("Q", "").strip())
    except (TypeError, ValueError):
        return Resultado(boleta, ROJA, None, "monto_invalido")
    if abs(monto - cfg.tarifa) > cfg.tolerancia_monto:
        return Resultado(boleta, ROJA, None, f"monto_anomalo({monto})")

    # ---- Etapa 2: coincidencia difusa ------------------------------------
    cands = padron.candidates(pago.get("nombre", ""), k_max=3)
    info = [{"carnet": c.carnet, "nombre": c.nombre, "k": c.k, "cov": c.coverage}
            for c in cands[:5]]
    if not cands:
        return Resultado(boleta, ROJA, None, "sin_coincidencias(k>=4)", info)

    # ---- Etapa 3: zonas ---------------------------------------------------
    cerca = [c for c in cands if c.k <= 1]
    if len(cerca) >= 2:
        return Resultado(boleta, AMARILLA, None, "colision_k<=1", info, cerca[0].k)
    if len(cerca) == 1 and len(cands) == 1:
        c = cerca[0]
        if c.coverage >= MIN_COVERAGE_VERDE:
            return Resultado(boleta, VERDE, c.carnet, "unico_k<=1", info, c.k)
        return Resultado(boleta, AMARILLA, None, "cobertura_insuficiente", info, c.k)
    if len(cerca) == 1:
        return Resultado(boleta, AMARILLA, None, "ambiguo_k<=1_con_otros_k<=3", info, cerca[0].k)
    
    return Resultado(boleta, AMARILLA, None,
                     "unico_2<=k<=3" if len(cands) == 1 else "multiples_2<=k<=3",
                     info, cands[0].k)

def clasificar_lote(pagos: list[dict], padron: Padron, cfg: Config) -> list[Resultado]:
    boletas = contar_boletas(pagos)
    return [clasificar_pago(p, padron, cfg, boletas) for p in pagos]