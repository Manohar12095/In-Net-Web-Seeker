import pathlib, shutil, subprocess, sys
triple = next(l.split(": ")[1] for l in subprocess.check_output(["rustc", "-vV"], text=True).splitlines()
              if l.startswith("host:"))
ext = ".exe" if sys.platform == "win32" else ""
subprocess.check_call(["uv", "run", "pyinstaller", "--onefile", "--name", "webseeker-engine",
                       "src/webseeker/__main__.py"], cwd="backend")
dst = pathlib.Path("src-tauri/binaries"); dst.mkdir(parents=True, exist_ok=True)
shutil.copy(f"backend/dist/webseeker-engine{ext}", dst / f"webseeker-engine-{triple}{ext}")
