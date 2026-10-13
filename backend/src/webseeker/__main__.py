# __main__.py  (absolute imports so PyInstaller works)
import argparse, os


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, required=True)
    ap.add_argument("--data-dir", required=True)
    ap.add_argument("--dev", action="store_true")             # dev token; only used by `npm run engine`
    ap.add_argument("--allow-private", action="store_true")   # local fixtures only
    a = ap.parse_args()
    os.environ["WEBSEEKER_DATA"] = a.data_dir
    if a.dev:
        os.environ.setdefault("WEBSEEKER_TOKEN", "dev-token")
    if a.allow_private:
        os.environ["WEBSEEKER_ALLOW_PRIVATE"] = "1"
    import uvicorn
    from webseeker.main import app
    uvicorn.run(app, host="127.0.0.1", port=a.port, log_level="warning")


if __name__ == "__main__":
    main()
