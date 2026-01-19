import { NextFunction, Request, Response } from "express";

export interface AppError extends Error {
  status?: number;
  statusCode?: number;
}

/**
 * Middleware para tratamento centralizado de erros
 */
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Erro interno do servidor";

  const errorLog = {
    timestamp: new Date().toISOString(),
    status,
    method: req.method,
    path: req.path,
    message,
    url: req.originalUrl,
    userAgent: req.get("user-agent"),
    stack: err.stack,
  };

  console.error("❌ ERRO:", errorLog);

  res.status(status).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === "development" && {
      details: {
        path: req.path,
        method: req.method,
        stack: err.stack?.split("\n").slice(0, 5),
      },
    }),
  });
};

/**
 * Middleware para rotas não encontradas (404)
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const error = new Error(
    `Rota não encontrada: ${req.method} ${req.path}`
  ) as AppError;
  error.status = 404;
  next(error);
};

/**
 * Wrapper para envolver funções assíncronas e capturar erros
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
