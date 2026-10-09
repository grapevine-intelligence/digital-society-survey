"""
Aggregate survey responses into ternary plots.

Reads responses.xlsx (exported from the survey site at /export) and draws the
present-day and 2060 responses as dots on ternary triangles with corners:
    Survival (top), Innovation (bottom-left), Nature (bottom-right).

Each dot is one respondent's weighting. Weights sum to 100.

Usage:
    python aggregate.py                 # reads responses.xlsx in this folder
    python aggregate.py path/to/file.xlsx

Outputs:
    aggregated_ternary.png
"""

import sys
import math
import pandas as pd
import matplotlib.pyplot as plt

# Triangle corners in 2D plotting space.
# Survival = top, Innovation = bottom-left, Nature = bottom-right.
A = (0.5, math.sqrt(3) / 2)  # Survival (top)
B = (0.0, 0.0)               # Innovation (bottom-left)
C = (1.0, 0.0)               # Nature (bottom-right)


def to_xy(survival, innovation, nature):
    """Convert three weights (summing to ~100) into x, y plot coordinates."""
    total = survival + innovation + nature
    if total == 0:
        return None
    a, b, c = survival / total, innovation / total, nature / total
    x = a * A[0] + b * B[0] + c * C[0]
    y = a * A[1] + b * B[1] + c * C[1]
    return x, y


def draw_triangle(ax, title):
    """Draw the empty ternary triangle with labelled corners and gridlines."""
    # Outline.
    ax.plot(
        [A[0], B[0], C[0], A[0]],
        [A[1], B[1], C[1], A[1]],
        color="#2b6777",
        linewidth=2,
        zorder=1,
    )

    # Light internal gridlines every 20%.
    for frac in [0.2, 0.4, 0.6, 0.8]:
        # Lines parallel to each edge.
        p1 = (A[0] + (B[0] - A[0]) * frac, A[1] + (B[1] - A[1]) * frac)
        p2 = (A[0] + (C[0] - A[0]) * frac, A[1] + (C[1] - A[1]) * frac)
        ax.plot([p1[0], p2[0]], [p1[1], p2[1]], color="#d7e3e6", linewidth=0.7, zorder=0)

        q1 = (B[0] + (A[0] - B[0]) * frac, B[1] + (A[1] - B[1]) * frac)
        q2 = (B[0] + (C[0] - B[0]) * frac, B[1] + (C[1] - B[1]) * frac)
        ax.plot([q1[0], q2[0]], [q1[1], q2[1]], color="#d7e3e6", linewidth=0.7, zorder=0)

        r1 = (C[0] + (A[0] - C[0]) * frac, C[1] + (A[1] - C[1]) * frac)
        r2 = (C[0] + (B[0] - C[0]) * frac, C[1] + (B[1] - C[1]) * frac)
        ax.plot([r1[0], r2[0]], [r1[1], r2[1]], color="#d7e3e6", linewidth=0.7, zorder=0)

    # Corner labels.
    ax.text(A[0], A[1] + 0.04, "Survival", ha="center", va="bottom",
            fontsize=11, fontweight="bold", color="#2b6777")
    ax.text(B[0] - 0.03, B[1] - 0.03, "Innovation", ha="right", va="top",
            fontsize=11, fontweight="bold", color="#2b6777")
    ax.text(C[0] + 0.03, C[1] - 0.03, "Nature", ha="left", va="top",
            fontsize=11, fontweight="bold", color="#2b6777")

    ax.set_title(title, fontsize=13, color="#1b2a2f", pad=14)
    ax.set_aspect("equal")
    ax.axis("off")


def plot_points(ax, df, prefix, color):
    """Scatter one period's responses, with a mean marker."""
    xs, ys = [], []
    for _, row in df.iterrows():
        pt = to_xy(
            row[f"{prefix}_survival"],
            row[f"{prefix}_innovation"],
            row[f"{prefix}_nature"],
        )
        if pt:
            xs.append(pt[0])
            ys.append(pt[1])

    ax.scatter(xs, ys, s=60, color=color, alpha=0.6,
               edgecolors="white", linewidths=0.8, zorder=3,
               label=f"responses (n={len(xs)})")

    # Group mean, so the analysis can reference a centroid.
    if xs:
        mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
        ax.scatter([mx], [my], s=180, marker="X", color="#1b2a2f",
                   zorder=4, label="mean")

    ax.legend(loc="upper right", fontsize=8, frameon=False)


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "responses.xlsx"

    try:
        df = pd.read_excel(path, sheet_name="responses")
    except FileNotFoundError:
        print(f"Could not find '{path}'. Download it from the survey site's /export first.")
        sys.exit(1)

    if df.empty:
        print("No responses found in the file yet.")
        sys.exit(1)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 6))

    draw_triangle(ax1, f"Today (2026)  —  {len(df)} respondents")
    plot_points(ax1, df, "present", "#c8553d")

    draw_triangle(ax2, f"The year 2060  —  {len(df)} respondents")
    plot_points(ax2, df, "future", "#52ab98")

    fig.suptitle(
        "How society weighs water: Survival vs Innovation vs Nature",
        fontsize=15, color="#2b6777", y=0.98,
    )

    plt.tight_layout(rect=[0, 0, 1, 0.95])
    out = "aggregated_ternary.png"
    plt.savefig(out, dpi=200, bbox_inches="tight")
    print(f"Saved {out} ({len(df)} responses).")


if __name__ == "__main__":
    main()
