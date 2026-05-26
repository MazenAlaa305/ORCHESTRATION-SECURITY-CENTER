// vite.config.js
import { defineConfig } from "file:///D:/Final%20year%20project/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///D:/Final%20year%20project/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.js"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["node_modules/", "src/tests/"]
    }
  },
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true
    }
  },
  build: {
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-charts": ["recharts"],
          "vendor-graph": ["react-force-graph-2d", "d3-force"],
          "vendor-motion": ["framer-motion"],
          "vendor-zustand": ["zustand"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxGaW5hbCB5ZWFyIHByb2plY3RcXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXEZpbmFsIHllYXIgcHJvamVjdFxcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovRmluYWwlMjB5ZWFyJTIwcHJvamVjdC9mcm9udGVuZC92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgICB0ZXN0OiB7XHJcbiAgICAgICAgZ2xvYmFsczogdHJ1ZSxcclxuICAgICAgICBlbnZpcm9ubWVudDogJ2pzZG9tJyxcclxuICAgICAgICBzZXR1cEZpbGVzOiBbJy4vc3JjL3Rlc3RzL3NldHVwLmpzJ10sXHJcbiAgICAgICAgY3NzOiBmYWxzZSxcclxuICAgICAgICBjb3ZlcmFnZToge1xyXG4gICAgICAgICAgICBwcm92aWRlcjogJ3Y4JyxcclxuICAgICAgICAgICAgcmVwb3J0ZXI6IFsndGV4dCcsICdsY292J10sXHJcbiAgICAgICAgICAgIGV4Y2x1ZGU6IFsnbm9kZV9tb2R1bGVzLycsICdzcmMvdGVzdHMvJ10sXHJcbiAgICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBwbHVnaW5zOiBbcmVhY3QoKV0sXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgICBob3N0OiB0cnVlLFxyXG4gICAgICAgIHBvcnQ6IDUxNzMsXHJcbiAgICAgICAgd2F0Y2g6IHtcclxuICAgICAgICAgICAgdXNlUG9sbGluZzogdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICBidWlsZDoge1xyXG4gICAgICAgIHNvdXJjZW1hcDogZmFsc2UsXHJcbiAgICAgICAgbWluaWZ5OiAnZXNidWlsZCcsXHJcbiAgICAgICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiA2MDAsXHJcbiAgICAgICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICAgICAgICBvdXRwdXQ6IHtcclxuICAgICAgICAgICAgICAgIG1hbnVhbENodW5rczoge1xyXG4gICAgICAgICAgICAgICAgICAgICd2ZW5kb3ItcmVhY3QnOiAgIFsncmVhY3QnLCAncmVhY3QtZG9tJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgJ3ZlbmRvci1xdWVyeSc6ICAgWydAdGFuc3RhY2svcmVhY3QtcXVlcnknXSxcclxuICAgICAgICAgICAgICAgICAgICAndmVuZG9yLWNoYXJ0cyc6ICBbJ3JlY2hhcnRzJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgJ3ZlbmRvci1ncmFwaCc6ICAgWydyZWFjdC1mb3JjZS1ncmFwaC0yZCcsICdkMy1mb3JjZSddLFxyXG4gICAgICAgICAgICAgICAgICAgICd2ZW5kb3ItbW90aW9uJzogIFsnZnJhbWVyLW1vdGlvbiddLFxyXG4gICAgICAgICAgICAgICAgICAgICd2ZW5kb3ItenVzdGFuZCc6IFsnenVzdGFuZCddLFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59KVxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXNSLFNBQVMsb0JBQW9CO0FBQ25ULE9BQU8sV0FBVztBQUVsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUN4QixNQUFNO0FBQUEsSUFDRixTQUFTO0FBQUEsSUFDVCxhQUFhO0FBQUEsSUFDYixZQUFZLENBQUMsc0JBQXNCO0FBQUEsSUFDbkMsS0FBSztBQUFBLElBQ0wsVUFBVTtBQUFBLE1BQ04sVUFBVTtBQUFBLE1BQ1YsVUFBVSxDQUFDLFFBQVEsTUFBTTtBQUFBLE1BQ3pCLFNBQVMsQ0FBQyxpQkFBaUIsWUFBWTtBQUFBLElBQzNDO0FBQUEsRUFDSjtBQUFBLEVBQ0EsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLFFBQVE7QUFBQSxJQUNKLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNILFlBQVk7QUFBQSxJQUNoQjtBQUFBLEVBQ0o7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNILFdBQVc7QUFBQSxJQUNYLFFBQVE7QUFBQSxJQUNSLHVCQUF1QjtBQUFBLElBQ3ZCLGVBQWU7QUFBQSxNQUNYLFFBQVE7QUFBQSxRQUNKLGNBQWM7QUFBQSxVQUNWLGdCQUFrQixDQUFDLFNBQVMsV0FBVztBQUFBLFVBQ3ZDLGdCQUFrQixDQUFDLHVCQUF1QjtBQUFBLFVBQzFDLGlCQUFrQixDQUFDLFVBQVU7QUFBQSxVQUM3QixnQkFBa0IsQ0FBQyx3QkFBd0IsVUFBVTtBQUFBLFVBQ3JELGlCQUFrQixDQUFDLGVBQWU7QUFBQSxVQUNsQyxrQkFBa0IsQ0FBQyxTQUFTO0FBQUEsUUFDaEM7QUFBQSxNQUNKO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFDSixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
