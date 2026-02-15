# Data Model

Last updated: 2026-02-15

## IndexedDB (emerson-violin-db v3)

### `sessions`
```
{
  id: string,
  day_key: "YYYY-MM-DD",
  duration_minutes: number,
  note: string,
  created_at: number // epoch ms
}
```

### `recordings`
```
{
  id: string,
  created_at: number,       // epoch ms
  duration_seconds: number,
  blob: Blob
}
```

### `syncQueue`
```
{
  id: string,
  created_at: number, // epoch ms
  payload: Session
}
```

### `shareInbox`
```
{
  id: string,
  name: string,
  size: number,
  mime: string,
  created_at: number, // epoch ms
  blob: Blob
}
```

## localStorage

### Preferences
Key: `shell:preferences`
```
{
  largeText: boolean,
  calmMode: boolean,
  highContrast: boolean,
  reduceMotion: boolean
}
```

### Install banner
Key: `shell:install-dismissed`
```
"true" | null
```

### Flow state
Key: `flow-state`
```
{
  "<step-id>": boolean
}
```

### Reflection
Key: `session-reflection:<YYYY-MM-DD>`
```
"Text reflection string"
```

### ML heuristics
Key: `ml-state`
```
{
  pitch: number[],
  rhythm: number[],
  focus: number[]
}
```
