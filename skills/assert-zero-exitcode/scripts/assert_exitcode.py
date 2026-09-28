#!/usr/bin/env python3
import sys
import argparse
import json
import subprocess

def run_and_assert(cmd: str) -> dict:
    try:
        proc = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        ok = proc.returncode == 0
        return {
            "cmd": cmd,
            "exitcode": proc.returncode,
            "ok": ok,
            "stdout": proc.stdout.strip(),
            "stderr": proc.stderr.strip()
        }
    except Exception as e:
        return {
            "cmd": cmd,
            "exitcode": -1,
            "ok": False,
            "error": str(e)
        }

def main():
    parser = argparse.ArgumentParser(description="Run command and assert exitcode == 0")
    parser.add_argument("--cmd", "-c", required=True, help="Shell command to run")
    args = parser.parse_args()

    res = run_and_assert(args.cmd)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    sys.exit(0 if res["ok"] else 1)

if __name__ == "__main__":
    main()
