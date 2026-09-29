import { handleForm, type Env } from '../../server/forms';

export const onRequest = (ctx: { request: Request; env: Env }) => handleForm(ctx.request, ctx.env, 'contact');
