[18:03:39.788] Running build in Washington, D.C., USA (East) – iad1
[18:03:39.788] Build machine configuration: 2 cores, 8 GB
[18:03:39.803] Cloning github.com/nlaff/snp-msp-ts (Branch: main, Commit: bd6ee18)
[18:03:39.814] Skipping build cache, deployment was triggered without cache.
[18:03:40.300] Cloning completed: 496.000ms
[18:03:40.597] Running "vercel build"
[18:03:40.988] Vercel CLI 46.0.3
[18:03:41.311] Installing dependencies...
[18:03:53.253] 
[18:03:53.255] added 27 packages in 11s
[18:03:53.255] 
[18:03:53.255] 3 packages are looking for funding
[18:03:53.256]   run `npm fund` for details
[18:03:53.317] Detected Next.js version: 14.2.10
[18:03:53.319] Running "npm run build"
[18:03:53.431] 
[18:03:53.431] > snp-msp-ts@0.1.0 build
[18:03:53.431] > next build
[18:03:53.432] 
[18:03:54.006] Attention: Next.js now collects completely anonymous telemetry regarding usage.
[18:03:54.006] This information is used to shape Next.js' roadmap and prioritize features.
[18:03:54.006] You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
[18:03:54.006] https://nextjs.org/telemetry
[18:03:54.006] 
[18:03:54.063]   ▲ Next.js 14.2.10
[18:03:54.064] 
[18:03:54.064]    Linting and checking validity of types ...
[18:03:54.415] 
[18:03:54.416]    We detected TypeScript in your project and reconfigured your tsconfig.json file for you. Strict-mode is set to false by default.
[18:03:54.416]    The following suggested values were added to your tsconfig.json. These values can be changed to fit your project's needs:
[18:03:54.416] 
[18:03:54.416]    	- noEmit was set to true
[18:03:54.417]    	- incremental was set to true
[18:03:54.417]    	- include was set to ['next-env.d.ts', '**/*.ts', '**/*.tsx']
[18:03:54.417] 
[18:03:54.417]    The following mandatory changes were made to your tsconfig.json:
[18:03:54.417] 
[18:03:54.417]    	- esModuleInterop was set to true (requirement for SWC / babel)
[18:03:54.418]    	- resolveJsonModule was set to true (to match webpack resolution)
[18:03:54.418]    	- isolatedModules was set to true (requirement for SWC / Babel)
[18:03:54.418] 
[18:03:56.647] Failed to compile.
[18:03:56.647] 
[18:03:56.648] ./pages/api/chat.ts:97:9
[18:03:56.648] Type error: Property assignment expected.
[18:03:56.648] 
[18:03:56.648] [0m [90m  95 |[39m   [33m...[39mconvo[33m,[39m[0m
[18:03:56.648] [0m [90m  96 |[39m ][33m,[39m[0m
[18:03:56.648] [0m[31m[1m>[22m[39m[90m  97 |[39m         ][33m,[39m[0m
[18:03:56.649] [0m [90m     |[39m         [31m[1m^[22m[39m[0m
[18:03:56.649] [0m [90m  98 |[39m       })[33m,[39m[0m
[18:03:56.649] [0m [90m  99 |[39m     })[33m;[39m[0m
[18:03:56.649] [0m [90m 100 |[39m[0m
[18:03:56.686] Error: Command "npm run build" exited with 1
