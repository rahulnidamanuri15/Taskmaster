from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException,
):
    """
    Handles all HTTPExceptions.
    """

    logger.warning(
        "%s %s -> %s",
        request.method,
        request.url.path,
        exc.detail,
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
        },
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
):
    """
    Handles request validation errors.
    """

    logger.warning(
        "Validation error on %s %s",
        request.method,
        request.url.path,
    )

    errors = []

    for error in exc.errors():
        errors.append(
            {
                "field": ".".join(
                    map(str, error["loc"][1:])
                ),
                "message": error["msg"],
            }
        )

    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation failed.",
            "errors": errors,
        },
    )


async def generic_exception_handler(
    request: Request,
    exc: Exception,
):
    """
    Handles unexpected exceptions.
    """

    logger.exception(
        "Unhandled exception on %s %s",
        request.method,
        request.url.path,
    )

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "An unexpected server error occurred.",
        },
    )


def register_exception_handlers(app: FastAPI):
    """
    Registers all exception handlers.
    """

    app.add_exception_handler(
        HTTPException,
        http_exception_handler,
    )
    
    app.add_exception_handler(
    StarletteHTTPException,
    http_exception_handler,
    )

    app.add_exception_handler(
        RequestValidationError,
        validation_exception_handler,
    )

    app.add_exception_handler(
        Exception,
        generic_exception_handler,
    )