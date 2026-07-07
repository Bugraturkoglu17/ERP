import os
import json
from typing import Dict, Any

def perform_impact_analysis(entity: str = None, domain: str = None, route: str = None, event: str = None, feature: str = None, module: str = None) -> Dict[str, Any]:
    feature_query = feature
    current_dir = os.path.dirname(os.path.abspath(__file__))
    architecture_dir = os.path.join(current_dir, "..", "..", "architecture")
    
    affected_routes = set()
    affected_entities = set()
    affected_domains = set()
    affected_events = set()
    storage_impact = set()
    dependencies_impact = set()
    module_impact = set()
    feature_impact = set()
    
    manifests = []
    if os.path.exists(architecture_dir):
        for filename in os.listdir(architecture_dir):
            if filename.endswith(".json") and filename not in ["events.json", "tasks.json"]:
                with open(os.path.join(architecture_dir, filename), "r", encoding="utf-8") as f:
                    try:
                        manifests.append(json.load(f))
                    except:
                        pass

    registry_dir = os.path.join(current_dir, "..", "..", "registry")
    modules_registry = []
    features_registry = []
    for registry_name, target in [("modules.json", modules_registry), ("features.json", features_registry)]:
        registry_path = os.path.join(registry_dir, registry_name)
        if os.path.exists(registry_path):
            with open(registry_path, "r", encoding="utf-8") as f:
                try:
                    target.extend(json.load(f))
                except Exception:
                    pass
                        
    for m in manifests:
        match = False
        if domain and domain.lower() == m.get("domain", "").lower():
            match = True
        if entity and entity in m.get("entities", []):
            match = True
        if route and any(route in r for r in m.get("routes", [])):
            match = True
        if event and (event in m.get("events", []) or event in m.get("notifications", [])):
            match = True
            
        if match:
            affected_domains.add(m.get("domain"))
            affected_routes.update(m.get("routes", []))
            affected_entities.update(m.get("entities", []))
            affected_events.update(m.get("events", []))
            affected_events.update(m.get("notifications", []))
            storage_impact.update(m.get("storage_prefixes", []))
            dependencies_impact.update(m.get("dependencies", []))

    for mod in modules_registry:
        module_id = mod.get("id")
        if (domain and domain.lower() == module_id.lower()) or (module and module.lower() == module_id.lower()):
            module_impact.add(module_id)
            dependencies_impact.update(mod.get("dependencies", []))
        if entity and entity in mod.get("entities", []):
            module_impact.add(mod.get("id"))
        if route and any(route in r for r in mod.get("routes", [])):
            module_impact.add(mod.get("id"))
        if event and event in mod.get("events", []):
            module_impact.add(mod.get("id"))

    for feature_item in features_registry:
        if feature_item.get("module_id") in module_impact:
            feature_impact.add(feature_item.get("id"))
        if feature_query and feature_item.get("id") == feature_query:
            feature_impact.add(feature_item.get("id"))
            module_impact.add(feature_item.get("module_id"))
            
    # Check dependencies (reverse lookup)
    for m in manifests:
        for d in list(affected_domains):
            if d in m.get("dependencies", []):
                affected_domains.add(m.get("domain"))
                affected_routes.update(m.get("routes", []))
                
    # Calculate Risk Level
    risk_level = "LOW"
    if len(affected_domains) > 2 or storage_impact:
        risk_level = "MEDIUM"
    if len(affected_domains) > 4 or any("finance" in d or "approvals" in d for d in affected_domains):
        risk_level = "HIGH"
        
    return {
        "query": {
            "entity": entity,
            "domain": domain,
            "route": route,
            "event": event,
            "feature": feature_query,
            "module": module
        },
        "risk_level": risk_level,
        "affected": {
            "domains": list(affected_domains),
            "routes": list(affected_routes),
            "entities": list(affected_entities),
            "events_and_notifications": list(affected_events),
            "storage_prefixes": list(storage_impact),
            "downstream_dependencies": list(dependencies_impact),
            "modules": list(module_impact),
            "features": list(feature_impact)
        }
    }
