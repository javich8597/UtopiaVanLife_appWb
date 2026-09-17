import os
import subprocess
import json

base_dir = r"C:\Users\javi_\Desktop\Proyectos\UtopiaVanLife\Landing Videos-images\Landing"
preview_dir = r"C:\Users\javi_\Desktop\Proyectos\UtopiaVanLife\UtopiaVanLife_appWb\temp_previews"
os.makedirs(preview_dir, exist_ok=True)

files = []
for root, dirs, filenames in os.walk(base_dir):
    rel_folder = os.path.relpath(root, base_dir)
    for f in filenames:
        files.append((os.path.join(root, f), rel_folder, f))

print(f"Total files found: {len(files)}")

results = []
for full_path, folder, filename in files:
    ext = os.path.splitext(filename)[1].lower()
    clean_folder = folder.replace("\\", "_").replace(" ", "_").replace(".", "root")
    thumb_name = f"{clean_folder}_{filename}.jpg"
    thumb_path = os.path.join(preview_dir, thumb_name)
    
    if ext in [".heic", ".png", ".jpg"]:
        cmd = f'ffmpeg -y -i "{full_path}" -vf "scale=480:-1" -vframes 1 "{thumb_path}"'
    elif ext in [".mov", ".mp4"]:
        cmd = f'ffmpeg -y -ss 00:00:01 -i "{full_path}" -vf "scale=480:-1" -vframes 1 "{thumb_path}"'
    else:
        cmd = None
        
    if cmd:
        subprocess.run(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    probe_cmd = f'ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration,nb_frames,display_aspect_ratio -show_entries format=duration,size -of json "{full_path}"'
    p = subprocess.run(probe_cmd, shell=True, capture_output=True, text=True)
    meta = {}
    try:
        data = json.loads(p.stdout)
        s = data.get("streams", [{}])[0]
        fmt = data.get("format", {})
        meta["width"] = s.get("width")
        meta["height"] = s.get("height")
        dur = s.get("duration") or fmt.get("duration")
        meta["duration"] = round(float(dur), 2) if dur else 0
        meta["size_mb"] = round(int(fmt.get("size", 0)) / (1024 * 1024), 2)
    except Exception as e:
        meta["error"] = str(e)
        
    results.append({
        "file": filename,
        "folder": folder,
        "path": full_path,
        "meta": meta,
        "thumb": thumb_name
    })

with open("media_inventory.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print("Analysis & thumbnails generation complete!")
