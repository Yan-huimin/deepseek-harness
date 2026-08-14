process.stdout.write('dsh web: http://127.0.0.1:43123\n')
process.on('SIGTERM', () => { process.exit(0) })
setInterval(() => {}, 1_000)
