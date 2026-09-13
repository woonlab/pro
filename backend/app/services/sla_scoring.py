from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.sla import SlaMetric

# (key, name, direction, weight%, threshold_100, threshold_90, threshold_80, threshold_70)
DEFAULT_METRICS: list[tuple[str, str, str, float, float, float, float, float]] = [
    ("availability_1", "가용성관리 1등급 업무가동률", "higher_better", 20, 99.91, 99.81, 99.73, 99.64),
    ("availability_2", "가용성관리 2등급 업무가동률", "higher_better", 15, 99.86, 99.70, 99.52, 99.38),
    ("availability_3", "가용성관리 3등급 업무가동률", "higher_better", 10, 99.76, 99.60, 99.46, 99.35),
    ("availability_4", "가용성관리 4등급 업무가동률", "higher_better", 5, 99.62, 99.39, 99.17, 98.96),
    ("failure_exceed", "장애조치 최대허용시간 초과건수", "lower_better", 10, 0, 1, 2, 3),
    ("failure_duplicate", "중복 장애건수", "lower_better", 5, 0, 1, 2, 3),
    ("failure_total", "총 장애건수", "lower_better", 5, 1, 3, 5, 7),
    ("backup_rate", "백업성공률", "higher_better", 10, 98.4, 96.6, 95.1, 93.5),
    ("change_failure", "변경작업 실패건수", "lower_better", 5, 1, 3, 5, 7),
    ("deliverable_level", "산출물관리수준", "higher_better", 5, 90, 80, 70, 60),
    ("security_compliance", "보안준수", "binary", 10, 0, 0, 0, 0),
]


def ensure_metrics(db: Session) -> list[SlaMetric]:
    existing = {m.key: m for m in db.scalars(select(SlaMetric))}
    created = False
    for key, name, direction, weight, t100, t90, t80, t70 in DEFAULT_METRICS:
        if key not in existing:
            db.add(
                SlaMetric(
                    key=key,
                    name=name,
                    direction=direction,
                    weight=weight,
                    threshold_100=t100,
                    threshold_90=t90,
                    threshold_80=t80,
                    threshold_70=t70,
                )
            )
            created = True
    if created:
        db.commit()
    return list(db.scalars(select(SlaMetric).order_by(SlaMetric.id)))


def score_for(metric: SlaMetric, value: float) -> int:
    t100, t90, t80, t70 = (
        float(metric.threshold_100),
        float(metric.threshold_90),
        float(metric.threshold_80),
        float(metric.threshold_70),
    )
    if metric.direction == "binary":
        return 0 if value else 100
    if metric.direction == "higher_better":
        if value >= t100:
            return 100
        if value >= t90:
            return 90
        if value >= t80:
            return 80
        if value >= t70:
            return 70
        return 60
    # lower_better
    if value <= t100:
        return 100
    if value <= t90:
        return 90
    if value <= t80:
        return 80
    if value <= t70:
        return 70
    return 60
