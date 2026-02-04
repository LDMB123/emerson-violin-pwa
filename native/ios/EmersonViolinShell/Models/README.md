# Models Folder

This folder is reserved for compiled Core ML models (`.mlmodelc`) downloaded at runtime.

Downloaded models are stored under:
`~/Library/Application Support/EmersonViolinShell/Models/`

If you want to bundle compiled models in the app, add `.mlmodel` files to the Xcode target
and let Xcode compile them into `.mlmodelc` during build.
