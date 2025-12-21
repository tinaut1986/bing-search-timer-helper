import json
import zipfile
import os

def create_bundle(browser_name):
    # Load base manifest
    with open('manifest.json', 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    if browser_name == 'chrome':
        # Adjust for Chrome
        if 'background' in manifest and 'scripts' in manifest['background']:
            manifest['background']['service_worker'] = manifest['background']['scripts'][0]
            del manifest['background']['scripts']
        output_file = 'extension_chrome.zip'
    else:
        # Adjust for Firefox
        if 'background' in manifest and 'service_worker' in manifest['background']:
            manifest['background']['scripts'] = [manifest['background']['service_worker']]
            del manifest['background']['service_worker']
        # Ensure Firefox specific settings
        if 'browser_specific_settings' not in manifest:
            manifest['browser_specific_settings'] = {"gecko": {}}
        manifest['browser_specific_settings']['gecko']['data_collection_permissions'] = False
        output_file = 'extension_firefox.zip'

    # Create the zip
    with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Files to ignore
        ignore = {'.git', '.gitignore', 'build_extension.py', '.vscode', 'extension_chrome.zip', 'extension_firefox.zip'}
        
        for root, dirs, files in os.walk('.'):
            dirs[:] = [d for d in dirs if d not in ignore]
            for file in files:
                if file in ignore: continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, '.')
                
                if file == 'manifest.json':
                    # Write the modified manifest instead of the file on disk
                    zipf.writestr('manifest.json', json.dumps(manifest, indent=2))
                else:
                    zipf.write(file_path, arcname)
    
    print(f"✅ Bundle created for {browser_name}: {output_file}")

if __name__ == "__main__":
    create_bundle('chrome')
    create_bundle('firefox')