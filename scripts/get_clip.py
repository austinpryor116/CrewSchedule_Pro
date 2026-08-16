import subprocess

r = subprocess.run([
    r'C:\Users\austi\AppData\Local\Android\Sdk\platform-tools\adb.exe',
    'shell', 'cmd', 'clipboard', 'get'
], capture_output=True, text=True)

print("CLIPBOARD TEXT:")
print("="*40)
print(r.stdout)
print("="*40)
