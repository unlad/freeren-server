import { Route, HTTPEndpoint } from "modules/routing/Routing";
import { Server } from "modules/server/Server"
import { Rank } from "modules/server/users/UserManager";

import { NextFunction, Request, Response } from "express"
import { v4 } from "uuid";
import { z } from "zod"
import { sign } from "cookie-signature";
import { serialize } from "cookie";

export default new Route({
    endpoints: [
        new HTTPEndpoint({
            method: "POST",
            handlers: [
                async (server: Server, req: Request, res: Response, next: NextFunction) => {
                    if (req.session.uuid) return res.send({ code: 1 })
                    
                    const schema = z.object({
                        id: z.string(),
                        name: z.string().max(128),
                        email: z.string().email(),
                        hash: z.string().length(128)
                    })

                    const { success, data } = schema.safeParse(req.body)
                    if (!success) return res.send({ code: 2 })

                    const uuid = v4()
                    const hash = await server.auth.getHash(data.hash)

                    const query = await server.users.create(uuid, data.id, data.name, data.email, hash)
                    if (query.code) return res.send({ code: 3 })

                    req.session.uuid = uuid
                    req.session.rank = Rank.STUDENT

                    const signature = server.auth.getSignature(req.session.id)
                    const cookie = serialize("connect.sid", signature).split("=").join("=s%3A")

                    res.send({ code: 0, cookie })
                },  
            ]
        })
    ]
});