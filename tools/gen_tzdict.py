import pandas as pd
import json
import os

# 1. 讀入 CSV
df = pd.read_csv('dict_concised_2014_20250326.csv', dtype=str)

# 2. 篩選只要單字（字詞名長度 = 1）
df['字詞名'] = df['字詞名'].astype(str)
chars = df[df['字詞名'].str.len() == 1]

# 3. 建立 mapping
mapping = {}
for _, row in chars.iterrows():
    ch = row['字詞名']
    mapping[ch] = {
        'radical': row.get('部首字', '').strip() or '—',
        'bopomofo': row.get('注音一式', '').strip() or '—',
        'definition': row.get('釋義', '').strip() or '—'
    }

# 4. 輸出到專案根目錄 tzdict.json
out_path = os.path.join('..','tzdict.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(mapping, f, ensure_ascii=False, indent=2)

print(f"產生完成：{out_path}，共 {len(mapping)} 個字條目。")
