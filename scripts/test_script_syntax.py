with open('android/app/src/main/java/com/crewschedule/pro/MainActivity.java', 'r', encoding='utf-8') as f:
    text = f.read()

import subprocess

start = text.find('String script =')
end = text.find('portalWebView.evaluateJavascript(script, null);')
js_block = text[start:end]

lines = js_block.splitlines()
code = []
for l in lines:
    first_q = l.find('"')
    last_q = l.rfind('"')
    if first_q != -1 and last_q > first_q:
        content = l[first_q+1:last_q]
        code.append(content)

raw_js = ''.join(code)

# Decode Java escape sequences
decoded = raw_js.replace('\\"', '"').replace('\\\\', '\\')
with open('exact_java_eval.js', 'w', encoding='utf-8') as f:
    f.write(decoded)

r = subprocess.run(['node', '--check', 'exact_java_eval.js'], capture_output=True, text=True)
print('Length of raw JS:', len(decoded))
print('Node syntax check return code:', r.returncode)
print('Node stdout:', r.stdout)
print('Node stderr:', r.stderr)
