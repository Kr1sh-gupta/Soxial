const { app } = require('electron')
app.whenReady().then(() => {
  console.log("SUCCESS: Electron started successfully without our main process code!")
  app.quit()
})
