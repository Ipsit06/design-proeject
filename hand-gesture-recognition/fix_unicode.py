import os

src_dir = r'C:\Users\lenovo\Desktop\design project\hand-gesture-recognition\src'

# Replace all non-ASCII printable characters with safe ASCII
for fname in os.listdir(src_dir):
    if not fname.endswith('.py'):
        continue
    fpath = os.path.join(src_dir, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    fixed_lines = []
    for line in lines:
        # Replace specific known bad chars
        line = line.replace('\u2192', '->')
        line = line.replace('\u2190', '<-')
        line = line.replace('\u2026', '...')
        line = line.replace('\u2014', '--')
        line = line.replace('\u2013', '-')
        line = line.replace('\u2500', '-')   # box drawing horizontal
        line = line.replace('\u2502', '|')   # box drawing vertical
        line = line.replace('\u250c', '+')
        line = line.replace('\u2510', '+')
        line = line.replace('\u2514', '+')
        line = line.replace('\u2518', '+')
        line = line.replace('\u251c', '+')
        line = line.replace('\u2524', '+')
        line = line.replace('\u252c', '+')
        line = line.replace('\u2534', '+')
        line = line.replace('\u253c', '+')
        line = line.replace('\u2588', '#')   # full block
        line = line.replace('\u2593', '#')
        line = line.replace('\u2592', '%')
        line = line.replace('\u2591', '.')
        line = line.replace('\u221a', 'v')   # checkmark/sqrt
        line = line.replace('\u00b7', '.')
        line = line.replace('\u00b0', 'deg')
        # Catch-all: replace any remaining non-ASCII with '?'
        safe = line.encode('ascii', errors='replace').decode('ascii')
        fixed_lines.append(safe)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.writelines(fixed_lines)
    print(f'Fixed: {fname}')

print('All done.')
