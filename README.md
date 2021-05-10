# Denly Framework

> A study & practice project for Deno...

## Functions

- Router System
- Achieve Args & Form Data
- Response System (redirect,abort)
- Memory System (useful cache)
- Session (realized in memory sys)

## Try it

You just need import one file on github (or gitee)

```typescript
import { Denly } from "./mod.ts";

let app = new Denly({ hostname: "127.0.0.1",port: 808 });

app.route.get("/", () => {
    return "Hello Denly!";
});

app.run();
```

It's easy to use, you don't need to download other file, just import the package from online.

## Developer

Author: ZhuoEr Liu <mrxzx@qq.com>

I am a back-end engineer and have recently been learning how to use Deno.