import json

# Metronome ticks every 0.77s (quarter note at 78bpm)
# Lightly Row (A - B - A)
BEAT = 0.77
WIDTH = 56

lightlyA = [
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬇️ bow', 'l': 2},
    
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬆️ bow', 'l': 2},
    
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬇️ bow', 'l': 2},
]

# The actual standard Lightly Row line 2 is identical to Line 1 but resolving to A. We'll simplify to A-B-A.
lightlyB = [
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬆️ bow', 'l': 2},
    
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬇️ bow', 'l': 2},
]

lightlyA2 = [
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬆️ bow', 'l': 2},
    
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'B4', 'f': 'Finger 1', 's': 'A string', 'b': '⬇️ bow', 'l': 2},
    
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'C#5', 'f': 'Finger 2', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬇️ bow', 'l': 1},
    
    {'p': 'A4', 'f': 'Finger 0', 's': 'A string', 'b': '⬆️ bow', 'l': 4},
]

lightlyFull = lightlyA + lightlyB + lightlyA2

totalBeats = 0
html = ''

for n in lightlyFull:
    start = totalBeats * BEAT
    duration = n['l'] * BEAT
    x = totalBeats * WIDTH
    w = n['l'] * WIDTH
    
    html += f'''          <div class="song-note" style="--note-x:{x:.0f}px;--note-width:{w:.0f}px;--note-start:{start:.2f}s;--note-duration:{duration:.2f}s">
            <span class="song-note-pitch">{n['p']}</span>
            <span class="song-note-meta">
              <span class="song-note-finger">{n['f']}</span>
              <span class="song-note-string">{n['s']}</span>
              <span class="song-note-bow">{n['b']}</span>
            </span>
          </div>\n'''
    
    totalBeats += n['l']

totalDuration = totalBeats * BEAT
totalWidth = totalBeats * WIDTH

print(f"STYLE STRING: --song-duration:{totalDuration:.2f}s;--song-width:{totalWidth:.0f}px;--beat-width:56px")
with open('/tmp/lightly_extended.html', 'w') as f:
    f.write(html)
print("Wrote to /tmp/lightly_extended.html")
