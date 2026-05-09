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
        # --- Adjustments for Firefox (Downgrade to Manifest V2 for automatic permissions) ---
        # In MV3, Firefox treats host permissions as optional, which prevents the content script 
        # from loading automatically until the user grants permission. MV2 avoids this.
        manifest['manifest_version'] = 2

        # Convert 'action' to 'browser_action' for MV2
        if 'action' in manifest:
            manifest['browser_action'] = manifest.pop('action')

        # Move 'host_permissions' to 'permissions' for MV2
        if 'host_permissions' in manifest:
            if 'permissions' not in manifest:
                manifest['permissions'] = []
            # Ensure no duplicates
            manifest['permissions'] = list(set(manifest['permissions'] + manifest.pop('host_permissions')))

        # Adjust Background for MV2 (Event Page)
        if 'background' in manifest:
            if 'service_worker' in manifest['background']:
                manifest['background']['scripts'] = [manifest['background'].pop('service_worker')]
            manifest['background']['persistent'] = False

        # Convert 'web_accessible_resources' from MV3 (objects) to MV2 (flat strings)
        if 'web_accessible_resources' in manifest:
            resources_v2 = []
            for entry in manifest['web_accessible_resources']:
                if isinstance(entry, dict) and 'resources' in entry:
                    resources_v2.extend(entry['resources'])
                elif isinstance(entry, str):
                    resources_v2.append(entry)
            manifest['web_accessible_resources'] = resources_v2

        # Ensure 'browser_specific_settings' exists for Firefox
        if 'browser_specific_settings' not in manifest:
            manifest['browser_specific_settings'] = {"gecko": {}}
        
        # Explicit ID is highly recommended for Firefox to avoid install errors
        if 'id' not in manifest['browser_specific_settings']['gecko']:
            # Make sure this ID matches the one in the store if updating!
            manifest['browser_specific_settings']['gecko']['id'] = "bing-timer-helper@tinaut1986.example.com"
        
        output_file = 'extension_firefox.zip'

    # Create the zip file emulating the extension root
    # Delete existing file if it exists to avoid Errno 22 on some Windows environments
    if os.path.exists(output_file):
        try:
            os.remove(output_file)
        except OSError as e:
            print(f"⚠️ Warning: Could not delete existing {output_file}: {e}")

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