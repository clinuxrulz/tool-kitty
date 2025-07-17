emcc \
  --bind -O1 \
  -s WASM=1 \
  -s BINARYEN_ASYNC_COMPILATION=0 \
  -s SINGLE_FILE=1 \
  -o gme.js \
  main.c \
  -Lbuild/gme \
  -lgme \
  -s EXPORTED_FUNCTIONS='[_main, _malloc, _gme_open_data, _gme_track_count, _gme_ignore_silence, _gme_start_track, _gme_track_ended, _gme_play]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s EXPORTED_RUNTIME_METHODS='[ccall, getValue, run]' \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s ENVIRONMENT='shell'
