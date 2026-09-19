import os
import re
import sys
import zipfile

def pack():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base_dir)

    # 1. Read version from module.prop
    version = "unknown"
    prop_path = os.path.join(base_dir, "module.prop")
    if os.path.exists(prop_path):
        with open(prop_path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                if line.startswith("version="):
                    version = line.strip().split("=", 1)[1]
                    break

    zip_name = f"box4_{version}.zip"
    zip_path = os.path.join(base_dir, zip_name)
    print(f"==> Packaging module into: {zip_name}...")

    # Files / dirs to include
    include_entries = [
        "META-INF",
        "box",
        "webroot",
        "tools",
        "action.sh",
        "box4_service.sh",
        "customize.sh",
        "module.prop",
        "uninstall.sh",
        "changelog.md",
        "LICENSE",
        "README.md",
        "README_zh.md",
    ]

    text_extensions = {
        ".sh", ".prop", ".conf", ".service", ".tproxy", ".webui",
        ".inotify", ".utils", ".json", ".yaml", ".yml", ".md",
        ".html", ".css", ".js", ".svg", ".zone", ".txt"
    }

    executable_paths = {
        "META-INF/com/google/android/update-binary",
        "customize.sh",
        "action.sh",
        "box4_service.sh",
        "uninstall.sh",
    }

    files_added = 0
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for entry in include_entries:
            full_entry_path = os.path.join(base_dir, entry)
            if not os.path.exists(full_entry_path):
                continue

            if os.path.isfile(full_entry_path):
                file_list = [full_entry_path]
            else:
                file_list = []
                for root, _, filenames in os.walk(full_entry_path):
                    for fn in filenames:
                        file_list.append(os.path.join(root, fn))

            for file_path in file_list:
                rel_path = os.path.relpath(file_path, base_dir).replace("\\", "/")
                
                # Check extension
                ext = os.path.splitext(file_path)[1].lower()
                basename = os.path.basename(file_path)
                
                with open(file_path, "rb") as f:
                    content = f.read()

                # Normalize CRLF to LF for text files or scripts
                is_text = ext in text_extensions or rel_path in executable_paths or "scripts" in rel_path
                if is_text:
                    content = content.replace(b"\r\n", b"\n")

                # ZipInfo with Unix permissions
                zinfo = zipfile.ZipInfo(rel_path)
                is_exec = (
                    rel_path in executable_paths or
                    rel_path.startswith("box/scripts/") or
                    rel_path.startswith("box/bin/") or
                    ext == ".sh"
                )
                if is_exec:
                    # 0o755: rwxr-xr-x
                    zinfo.external_attr = 0o100755 << 16
                else:
                    # 0o644: rw-r--r--
                    zinfo.external_attr = 0o100644 << 16

                zf.writestr(zinfo, content)
                files_added += 1

    print(f"==> Successfully packaged {files_added} files into {zip_name} ({os.path.getsize(zip_path)} bytes)")
    return zip_path

if __name__ == "__main__":
    pack()
