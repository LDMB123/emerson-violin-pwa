import json

BEAT = 0.63 # 96 BPM = 60/96 = 0.625
WIDTH = 56

# Ode to Joy
# F# F# G A | A G F# E | D D E F# | F#(1.5) E(.5) E(2)
# F# F# G A | A G F# E | D D E F# | E(1.5) D(.5) D(2)

ode = [
    # Measure 1
    {'p': 'F#5', 'f': 'Finger 1', 's': 'E string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'F#5', 'f': 'Finger 1', 's': 'E string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'G5', 'f': 'Finger 2', 's': 'E string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'A5', 'f': 'Finger 3', 's': 'E string', 'b': '⬆️ bow', 'l': 1},
    
    # Measure 2
    {'p': 'A5', 'f': 'Finger 3', 's': 'E string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'G5', 'f': 'Finger 2', 's': 'E string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'F#5', 'f': 'Finger 1', 's': 'E string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬆️ bow', 'l': 1},
    
    # Measure 3
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'F#5', 'f': 'Finger 1', 's': 'E string', 'b': '⬆️ bow', 'l': 1},
    
    # Measure 4
    {'p': 'F#5', 'f': 'Finger 1', 's': 'E string', 'b': '⬇️ bow', 'l': 1.5},
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬆️ bow', 'l': 0.5},
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬇️ bow', 'l': 2},
    
    # Measure 5
    {'p': 'F#5', 'f': 'Finger 1', 's': 'E string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'F#5', 'f': 'Finger 1', 's': 'E string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'G5', 'f': 'Finger 2', 's': 'E string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'A5', 'f': 'Finger 3', 's': 'E string', 'b': '⬇️ bow', 'l': 1},
    
    # Measure 6
    {'p': 'A5', 'f': 'Finger 3', 's': 'E string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'G5', 'f': 'Finger 2', 's': 'E string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'F#5', 'f': 'Finger 1', 's': 'E string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬇️ bow', 'l': 1},
    
    # Measure 7
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬇️ bow', 'l': 1},
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬆️ bow', 'l': 1},
    {'p': 'F#5', 'f': 'Finger 1', 's': 'E string', 'b': '⬇️ bow', 'l': 1},
    
    # Measure 8
    {'p': 'E5', 'f': 'Finger 0', 's': 'E string', 'b': '⬆️ bow', 'l': 1.5},
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬇️ bow', 'l': 0.5},
    {'p': 'D5', 'f': 'Finger 3', 's': 'A string', 'b': '⬆️ bow', 'l': 2},
]

totalBeats = 0
html = ''

for n in ode:
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
with open('/tmp/ode_extended.html', 'w') as f:
    f.write(html)
print("Wrote to /tmp/ode_extended.html")
