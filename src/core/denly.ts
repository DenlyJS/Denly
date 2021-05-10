// Copyright 2020-2021 the mrxiaozhuox. All rights reserved. MIT license

/**
 * Denly Framework
 * @author mrxiaozhuox<mrxzx@qq.com>
 * @abstract Denly Framework
 */

// Deno 标准库 - HTTP Server
import { ServerRequest } from "https://deno.land/std@0.92.0/http/server.ts";

// Denly 服务器处理器
import { Server, DenlyHttp, HttpState } from "./server/http.ts";
import { httpInit, httpResp, Request, Response } from "./server/http.ts";
import { postDecoder, getDecoder, RequestData } from "./server/body.ts";
import { bindCookie, loadCookie } from "./storage.ts";

// Denly Support - 辅助程序 
import { EConsole, colorTab } from "../support/console.ts";

// Denly Router 路由程序
import { RouteController, Router } from '../core/router.ts';

// Denly Memory
import { Memory } from "../library/memory.ts";

import { _dirname } from "../../mod.ts";


export interface DeOption {
    hostname: string,
    port: number,
    options?: {
        debug?: boolean
    }
}

interface DeConfig {
    storage: {
        log: string,
        template: string
    },
    memory: {
        interval: number
    },
    controller: {
        usable: boolean,
        path: string
    }
}

export class Denly {

    public config: DeConfig = {
        storage: {
            log: _dirname + "/runtime/log",
            template: _dirname + "/template"
        },
        memory: {
            interval: 360 * 1000
        },
        controller: {
            usable: false,
            path: ""
        }
    };

    public route = Router;

    private http: DenlyHttp;

    constructor(options?: DeOption, http?: DenlyHttp) {

        if (http) {
            this.http = http;
        } else {
            if (options) {
                this.http = new DenlyHttp(
                    options.hostname,
                    options.port,
                    options.options
                );
            } else {
                this.http = new DenlyHttp('0.0.0.0', 808, { debug: false });
            }
        }

        Memory.loader();
    }

    /**
     * 数据请求处理
     */
    public async proxy(request: ServerRequest): Promise<HttpState> {

        let status: number = 200;

        let sections: Array<string> = pathParser(request.url); // 路径解析

        let args: Array<RequestData> = [];
        let form: Array<RequestData> = [];

        let context: Uint8Array | Deno.Reader | string = "";

        loadCookie(request); // 读取存在的 Cookie

        // 除去 GET 请求才支持 FormData, Urlencoded, Raw, File 等提交
        if (request.method == "GET") {
            args = getDecoder(request.url);
        } else {
            const origin: Uint8Array = await Deno.readAll(request.body);
            form = postDecoder(origin, request.headers);
        }

        // Request 数据绑定（用于 Request 数据获取）
        httpInit({ args, form });

        // 路由解析器
        let target = RouteController.processer(sections, request.method);

        if (target) {
            if (typeof target.route == "function") {
                try {
                    context = target.route(Request, Response, [...target.parms]);
                } catch (error) {
                    if (typeof error == "number") {
                        status = error;
                    } else {
                        status = 500;
                    }
                }
            }
        } else {
            status = 404;
        }

        let resp = httpResp();

        // Redirect 处理器（重定向）
        if (resp.redirect != "#" && resp.redirect != "") {
            let header: Headers = new Headers();
            header.set("Location", resp.redirect);
            request.respond({ status: 301, body: "", headers: header });
        }

        let result = {
            status: status,
            body: context,
            headers: resp.header
        };

        // Error
        if (resp.error != 200 || status != 200) {
            if (status == 200) status = resp.error;
            result = RouteController.httpError(status);
        }

        // 将框架 Cookie 绑定至程序
        bindCookie(result);

        // 返回最终结果
        request.respond(result);

        return { code: status };
    }

    /**
     * Denly Server 运行程序
     */
    public async run() {

        let http: DenlyHttp = this.http;

        let host: string = http.addr['hostname'];
        let port: number = http.addr['port'];

        let server: Server = http.serve;

        // 服务器信息渲染
        let path = colorTab.Blue + "http://" + host + ':' + port + colorTab.Clean;
        EConsole.blank();
        EConsole.info(`HTTP Server ${path} 已启动！`);
        if (http.debug) {
            EConsole.warn("开启了 Debug 模式（仅用于开发环境）");
        }
        EConsole.blank();

        Memory.listener({ interval: this.config.memory.interval, http: this.http });

        for await (const request of http.serve) {
            this.proxy(request).then(({ code }) => {

                Denly.reqinfo(request, code); // 请求数据渲染

            });
        }
    }

    private static reqinfo(r: ServerRequest, code: number): void {

        let status: string = "";
        if (code == 200) {
            status = colorTab.Green + code + colorTab.Clean;
        } else {
            status = colorTab.Red + code + colorTab.Clean;
        }

        let message: string = `${r.proto}: ${r.method} - ${r.url} ${status}`;
        EConsole.info(message);
    }
}

/**
 * 访问 URL 解析程序
 */
export function pathParser(url: string) {
    if (url.includes("?")) {
        url = url.split("?")[0];
    }

    let sections = url.split("/").filter(s => s != "");

    if (sections.length < 1) {
        sections = ["_PATH_ROOT_"];
    }

    return sections;
}