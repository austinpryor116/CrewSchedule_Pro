import re
import subprocess

with open('android/app/src/main/java/com/crewschedule/pro/MainActivity.java', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('String script =')
end = text.find('portalWebView.evaluateJavascript(script, null);')
js_block = text[start:end]

lines = js_block.splitlines()
code_lines = []
for l in lines:
    m = re.search(r'\"(.*)\"', l)
    if m:
        code_lines.append(m.group(1).replace('\\"', '"').replace('\\\\', '\\'))

full_js = '\n'.join(code_lines)
print('Length of reconstructed JS:', len(full_js))
with open('temp_script_check.js', 'w', encoding='utf-8') as f:
    f.write(full_js)

res = subprocess.run(['node', '--check', 'temp_script_check.js'], capture_output=True, text=True)
print('Returncode:', res.returncode)
print('Stdout:', res.stdout)
print('Stderr:', res.stderr)
