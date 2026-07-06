"""
Compares four ways of computing running efficiency, using real data pulled
from the /activities/compare-ef route:

  1. first20EF  — original live formula: velocity / heartrate, first 20%.
  2. hrrEF       — velocity / %HRR, same first-20% window.
  3. wholeRunEF  — velocity / heartrate, whole post-warmup stream.
  4. gapEF       — grade-adjusted velocity / %HRR, whole post-warmup stream.
                   (the target formula: window fix + HRR + terrain correction)

All four are z-score normalized (mean 0, std 1) before plotting.

Usage:
    1. Hit GET /activities/compare-ef (with a valid auth token) and save
       the JSON response to compare_ef.json in this same folder.
    2. Run: python3 compare_ef_gap.py
"""

import json
from datetime import datetime
import matplotlib.pyplot as plt
import matplotlib.dates as mdates


def load_data(path='compare_ef.json'):
    with open(path) as f:
        data = json.load(f)
    for row in data:
        row['date'] = datetime.fromisoformat(row['date'].replace('Z', '+00:00'))
    data.sort(key=lambda r: r['date'])
    return data


def rolling_average(values, window=5):
    result = []
    for i in range(len(values)):
        start = max(0, i - window + 1)
        chunk = values[start:i + 1]
        result.append(sum(chunk) / len(chunk))
    return result


def z_score(values):
    n = len(values)
    mean = sum(values) / n
    std = (sum((x - mean) ** 2 for x in values) / n) ** 0.5
    if std == 0:
        return [0 for _ in values]
    return [(x - mean) / std for x in values]


def correlation(a, b):
    n = len(a)
    mean_a = sum(a) / n
    mean_b = sum(b) / n
    cov = sum((a[i] - mean_a) * (b[i] - mean_b) for i in range(n)) / n
    std_a = (sum((x - mean_a) ** 2 for x in a) / n) ** 0.5
    std_b = (sum((x - mean_b) ** 2 for x in b) / n) ** 0.5
    return cov / (std_a * std_b) if std_a and std_b else 0


def plot_overlay(data):
    dates = [r['date'] for r in data]
    first20 = [r['first20EF'] for r in data]
    hrr = [r['hrrEF'] for r in data]
    whole = [r['wholeRunEF'] for r in data]
    gap = [r['gapEF'] for r in data]

    series = {
        'First 20% (original)': (first20, '#888888', ':'),
        'HRR (first 20%)': (hrr, '#378ADD', '--'),
        'Whole run (raw HR)': (whole, '#1D9E75', '-.'),
        'GAP + HRR (whole run) — target formula': (gap, '#000000', '-'),
    }

    fig, ax = plt.subplots(figsize=(13, 6.5))
    fig.patch.set_facecolor('#ffffff')
    ax.set_facecolor('#ffffff')

    for label, (values, color, style) in series.items():
        roll = rolling_average(values)
        roll_z = z_score(roll)
        lw = 2.5 if 'target' in label else 1.5
        ax.plot(dates, roll_z, color=color, linewidth=lw, linestyle=style,
                 label=f'{label} — rolling avg', zorder=3)

    ax.axhline(0, color='#cccccc', linewidth=1, zorder=1)

    ax.set_title('EF formula comparison (normalized) — first20 vs HRR vs whole-run vs GAP+HRR',
                  color='#000000', fontsize=13)
    ax.set_ylabel("Standard deviations from each series' own mean", color='#000000', fontsize=10)
    ax.tick_params(colors='#000000')
    ax.spines[['top', 'right']].set_visible(False)
    ax.spines[['bottom', 'left']].set_color('#cccccc')
    ax.grid(axis='y', color='#e5e5e5', linewidth=0.5)
    ax.legend(facecolor='#ffffff', edgecolor='#cccccc', labelcolor='#000000', fontsize=9)

    ax.xaxis.set_major_formatter(mdates.DateFormatter('%b %d'))
    fig.autofmt_xdate()

    plt.tight_layout()
    plt.savefig('ef_gap_comparison.png', facecolor='#ffffff', dpi=150)
    print("Saved chart to ef_gap_comparison.png")
    plt.show()


def print_correlations(data):
    first20 = [r['first20EF'] for r in data]
    hrr = [r['hrrEF'] for r in data]
    whole = [r['wholeRunEF'] for r in data]
    gap = [r['gapEF'] for r in data]

    print(f"\nRuns compared: {len(data)}")
    print(f"first20 vs gap:  {correlation(first20, gap):.4f}")
    print(f"hrr vs gap:      {correlation(hrr, gap):.4f}")
    print(f"whole vs gap:    {correlation(whole, gap):.4f}")


if __name__ == '__main__':
    data = load_data()
    print_correlations(data)
    plot_overlay(data)