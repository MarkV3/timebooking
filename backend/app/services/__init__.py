from importlib import import_module
from types import ModuleType
from typing import TYPE_CHECKING

__all__ = ["time_slots"]

time_slots: ModuleType = import_module("app.services.time_slots")  # noqa: E402

if TYPE_CHECKING:  # pragma: no cover
    from app.services.time_slots import *  # re-export for type checkers 