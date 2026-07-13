import re
import json
import logging
from typing import Any, Dict, Optional
from uuid import UUID

logger = logging.getLogger(__name__)

def parse_coordinates(url_or_str: Optional[str]) -> tuple[str, str]:
    default_lat = "41.0082"
    default_long = "28.9784"
    if not url_or_str:
        return default_lat, default_long
    match = re.search(r"(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)", url_or_str)
    if match:
        return match.group(1), match.group(2)
    return default_lat, default_long

def resolve_key_path(key_path: str, context: Dict[str, Any]) -> Any:
    """
    Safely resolves a dot-separated path (e.g. 'entity.assigned_to_name')
    against a given context dictionary.
    """
    if not isinstance(key_path, str):
        return key_path
        
    parts = key_path.split(".")
    first = parts[0]
    
    # Map aliases
    if first == "entity":
        first = "work_order"
    elif first == "link":
        first = "public_link"
        
    allowed_roots = {"work_order", "project", "public_link", "tenant", "user", "coords"}
    if first not in allowed_roots:
        return key_path  # Return string literally if not starting with an allowed root
        
    # Handle coords special logic
    if first == "coords":
        wo = context.get("work_order")
        proj = context.get("project")
        loc_url = getattr(wo, "location_url", None) if wo else None
        lat, lon = parse_coordinates(loc_url)
        
        if len(parts) < 2:
            return f"{lat},{lon}"
            
        attr = parts[1]
        if attr == "latitude":
            return lat
        elif attr == "longitude":
            return lon
        elif attr == "name":
            return getattr(proj, "name", None) or "Şantiye Alanı"
        elif attr == "address":
            return loc_url or getattr(proj, "description", None) or "Belirtilen Konum"
        return "-"

    # Traverse object attributes
    current = context.get(first)
    if current is None:
        return "-"
        
    for attr in parts[1:]:
        if current is None:
            return "-"
        if isinstance(current, dict):
            current = current.get(attr)
        else:
            current = getattr(current, attr, None)
            
    if current is None:
        return "-"
        
    if isinstance(current, (UUID, bytes)):
        return str(current)
        
    return current

def resolve_template_components(mapping_str: str, context: Dict[str, Any]) -> list:
    """
    Parses mapping_str JSON and recursively resolves all values using resolve_key_path.
    """
    try:
        data = json.loads(mapping_str)
    except Exception as e:
        logger.error(f"Failed to parse component_mapping_json: {e}")
        return []
        
    def _resolve(node: Any) -> Any:
        if isinstance(node, dict):
            return {k: _resolve(v) for k, v in node.items()}
        elif isinstance(node, list):
            return [_resolve(x) for x in node]
        elif isinstance(node, str):
            first_part = node.split(".")[0]
            if first_part in {"entity", "link", "work_order", "project", "public_link", "tenant", "user", "coords"}:
                return resolve_key_path(node, context)
            return node
        return node

    resolved = _resolve(data)
    return resolved.get("components", [])
