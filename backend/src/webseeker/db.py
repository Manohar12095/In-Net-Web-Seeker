import uuid
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy import JSON, BigInteger, DateTime, ForeignKey, Integer, String, Text, create_engine, event, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column


def _id() -> str: return uuid.uuid4().hex
def _now(): return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Project(Base):
    __tablename__ = "project"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    name: Mapped[str] = mapped_column(String(200))
    target: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Run(Base):
    __tablename__ = "run"
    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("project.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(16), default="running")
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Resource(Base):
    __tablename__ = "resource"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("run.id", ondelete="CASCADE"), index=True)
    url: Mapped[str] = mapped_column(Text)
    final_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    referrer: Mapped[str | None] = mapped_column(Text, nullable=True)
    depth: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16))        # ok | http_error | skipped | blocked | too_large | error
    http_status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mime: Mapped[str | None] = mapped_column(String(100), nullable=True)
    detected: Mapped[str | None] = mapped_column(String(32), nullable=True)
    size: Mapped[int] = mapped_column(BigInteger, default=0)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)


class Event(Base):
    __tablename__ = "event"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("run.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(24))
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


engine = None


def init(data_dir: Path) -> None:
    global engine
    data_dir.mkdir(parents=True, exist_ok=True)
    engine = create_engine(f"sqlite:///{data_dir / 'webseeker.db'}")

    @event.listens_for(engine, "connect")
    def _pragmas(conn, _):
        cur = conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.execute("PRAGMA journal_mode=WAL")
        cur.close()

    Base.metadata.create_all(engine)       # Phase 6: replace with an Alembic baseline migration


def create_project(name: str, target: str) -> dict:
    with Session(engine) as s, s.begin():
        p = Project(name=name, target=target)
        s.add(p)
        s.flush()
        return {"id": p.id, "name": p.name, "target": p.target}


def list_projects() -> list[dict]:
    with Session(engine) as s:
        rows = s.scalars(select(Project).order_by(Project.created_at.desc())).all()
        return [{"id": p.id, "name": p.name, "target": p.target, "created_at": p.created_at.isoformat()} for p in rows]


def create_run(project_id: str, config: dict) -> str:
    with Session(engine) as s, s.begin():
        r = Run(project_id=project_id, config=config)
        s.add(r)
        s.flush()
        return r.id


def finish_run(run_id: str, status: str) -> None:
    with Session(engine) as s, s.begin():
        r = s.get(Run, run_id)
        if r:
            r.status, r.finished_at = status, _now()


def get_run(run_id: str) -> dict | None:
    with Session(engine) as s:
        r = s.get(Run, run_id)
        if not r:
            return None
        return {
            "id": r.id,
            "project_id": r.project_id,
            "status": r.status,
            "config": r.config or {},
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "finished_at": r.finished_at.isoformat() if r.finished_at else None,
        }


def save_event(run_id: str, kind: str, d: dict) -> None:
    with Session(engine) as s, s.begin():
        if kind == "resource":
            s.add(Resource(run_id=run_id, url=d["url"], final_url=d.get("final_url"), referrer=d.get("referrer"),
                           depth=d.get("depth", 0), status=d["status"], http_status=d.get("http_status"),
                           mime=d.get("mime"), detected=d.get("detected"), size=d.get("bytes", 0),
                           sha256=d.get("sha256"), error=d.get("error")))
        else:
            s.add(Event(run_id=run_id, kind=kind, data=d))


def resources_for_project(project_id: str) -> list[dict]:
    q = (select(Resource).join(Run, Resource.run_id == Run.id)
         .where(Run.project_id == project_id, Resource.status == "ok"))
    with Session(engine) as s:
        return [{"id": r.id, "url": r.url, "mime": r.mime, "size": r.size, "sha256": r.sha256, "detected": r.detected}
                for r in s.scalars(q)]


def get_project(project_id: str) -> dict | None:
    with Session(engine) as s:
        p = s.get(Project, project_id)
        if not p:
            return None
        runs = s.scalars(select(Run).where(Run.project_id == project_id).order_by(Run.started_at.desc())).all()
        return {
            "id": p.id,
            "name": p.name,
            "target": p.target,
            "created_at": p.created_at.isoformat(),
            "runs": [
                {
                    "id": r.id,
                    "status": r.status,
                    "started_at": r.started_at.isoformat(),
                    "finished_at": r.finished_at.isoformat() if r.finished_at else None,
                    "config": r.config,
                }
                for r in runs
            ],
        }


def all_resources_for_project(project_id: str, run_id: str | None = None) -> list[dict]:
    with Session(engine) as s:
        q = select(Resource).join(Run, Resource.run_id == Run.id).where(Run.project_id == project_id)
        if run_id:
            q = q.where(Resource.run_id == run_id)
        q = q.order_by(Resource.id.asc())
        rows = s.scalars(q).all()
        return [
            {
                "id": r.id,
                "run_id": r.run_id,
                "url": r.url,
                "final_url": r.final_url,
                "referrer": r.referrer,
                "depth": r.depth,
                "status": r.status,
                "http_status": r.http_status,
                "mime": r.mime,
                "detected": r.detected,
                "size": r.size,
                "sha256": r.sha256,
                "error": r.error,
            }
            for r in rows
        ]


def get_resource_by_id(resource_id: int) -> dict | None:
    with Session(engine) as s:
        r = s.get(Resource, resource_id)
        if not r:
            return None
        return {
            "id": r.id,
            "run_id": r.run_id,
            "url": r.url,
            "final_url": r.final_url,
            "referrer": r.referrer,
            "depth": r.depth,
            "status": r.status,
            "http_status": r.http_status,
            "mime": r.mime,
            "detected": r.detected,
            "size": r.size,
            "sha256": r.sha256,
            "error": r.error,
        }


def compare_runs(run_id_a: str, run_id_b: str) -> dict:
    """Compare two collection runs by resource URL and SHA-256."""
    with Session(engine) as s:
        res_a = s.scalars(select(Resource).where(Resource.run_id == run_id_a)).all()
        res_b = s.scalars(select(Resource).where(Resource.run_id == run_id_b)).all()

        map_a = {r.url: r for r in res_a}
        map_b = {r.url: r for r in res_b}

        urls_a = set(map_a.keys())
        urls_b = set(map_b.keys())

        added_urls = urls_b - urls_a
        removed_urls = urls_a - urls_b
        common_urls = urls_a & urls_b

        modified = []
        unchanged = []
        for u in common_urls:
            ra = map_a[u]
            rb = map_b[u]
            if ra.sha256 != rb.sha256:
                modified.append({
                    "url": u,
                    "sha256_old": ra.sha256,
                    "sha256_new": rb.sha256,
                    "size_old": ra.size,
                    "size_new": rb.size,
                })
            else:
                unchanged.append({"url": u, "sha256": ra.sha256, "size": ra.size})

        return {
            "run_id_old": run_id_a,
            "run_id_new": run_id_b,
            "added": [{"url": u, "sha256": map_b[u].sha256, "size": map_b[u].size, "mime": map_b[u].mime} for u in added_urls],
            "removed": [{"url": u, "sha256": map_a[u].sha256, "size": map_a[u].size, "mime": map_a[u].mime} for u in removed_urls],
            "modified": modified,
            "unchanged_count": len(unchanged),
            "summary": {
                "total_old": len(res_a),
                "total_new": len(res_b),
                "added_count": len(added_urls),
                "removed_count": len(removed_urls),
                "modified_count": len(modified),
            },
        }

