import json
import zipfile
import os

def create_bundle(browser_name):
    # Load base manifest
    # We read the manifest.json from the current directory
    if not os.path.exists('manifest.json'):
        print("❌ Error: manifest.json not found in the current directory.")
        return

    with open('manifest.json', 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    if browser_name == 'chrome':
        # --- Adjustments for Chrome (Manifest V3) ---
        # Chrome requires 'service_worker' instead of 'scripts' array
        if 'background' in manifest and 'scripts' in manifest['background']:
            manifest['background']['service_worker'] = manifest['background']['scripts'][0]
            del manifest['background']['scripts']
        
        # Chrome doesn't recognize Firefox-specific settings
        if 'browser_specific_settings' in manifest:
            del manifest['browser_specific_settings']
            
        output_file = 'extension_chrome.zip'
    else:
        # --- Adjustments for Firefox (Manifest V3) ---
        # Firefox requires 'scripts' array and doesn't support 'service_worker' key in MV3 yet
        # Our base manifest already uses 'scripts', but let's handle the case if it were reversed
        if 'background' in manifest and 'service_worker' in manifest['background']:
            manifest['background']['scripts'] = [manifest['background']['service_worker']]
            del manifest['background']['service_worker']
        
        # Ensure 'browser_specific_settings' exists for Firefox
        if 'browser_specific_settings' not in manifest:
            manifest['browser_specific_settings'] = {"gecko": {}}
        
        # Explicit ID is highly recommended for Firefox to avoid install errors
        if 'id' not in manifest['browser_specific_settings']['gecko']:
            # Make sure this ID matches the one in the store if updating!
            manifest['browser_specific_settings']['gecko']['id'] = "bing-timer-helper@tinaut1986.example.com"

        # NOTE: Removed 'data_collection_permissions' injection as it was causing validation errors.
        
        output_file = 'extension_firefox.zip'

    # Create the zip file emulating the extension root
    with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Files and directories to strictly ignore
        ignore = {
            '.git', '.gitignore', 'build_extension.py', '.vscode', 
            'extension_chrome.zip', 'extension_firefox.zip', 'node_modules',
            'repomix-output.xml', '.DS_Store', 'Thumbs.db'
        }
        
        for root, dirs, files in os.walk('.'):
            # Exclude ignored directories
            dirs[:] = [d for d in dirs if d not in ignore]
            
            for file in files:
                if file in ignore: 
                    continue
                    
                file_path = os.path.join(root, file)
                # Ensure the path inside the ZIP starts from the root
                arcname = os.path.relpath(file_path, '.')
                
                if file == 'manifest.json':
                    # Write the dynamically modified manifest
                    zipf.writestr('manifest.json', json.dumps(manifest, indent=2))
                    print(f"📝 Manifest adapted for {browser_name} written to ZIP.")
                else:
                    zipf.write(file_path, arcname)
    
    print(f"✅ Bundle created for {browser_name}: {output_file}")

if __name__ == "__main__":
    # Generate both packages with a single execution
    create_bundle('chrome')
    create_bundle('firefox')