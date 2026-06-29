import os
import sys
import json
import argparse

def get_models():
    """Simple parser to get model class names from models.py"""
    models = set()
    models_path = os.path.join(os.path.dirname(__file__), "..", "app", "db", "models.py")
    if not os.path.exists(models_path):
        return models
    
    with open(models_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("class ") and "(" in line:
                class_name = line.split("class ")[1].split("(")[0].strip()
                models.add(class_name)
    return models

def lint_architecture(strict=False):
    architecture_dir = os.path.join(os.path.dirname(__file__), "..", "architecture")
    if not os.path.exists(architecture_dir):
        print("Architecture directory not found.")
        sys.exit(1)
        
    available_models = get_models()
    
    warnings = []
    errors = []
    
    for filename in os.listdir(architecture_dir):
        if not filename.endswith(".json"):
            continue
            
        if filename in ["events.json", "tasks.json"]:
            continue # skip event/task registries for this specific linter
            
        filepath = os.path.join(architecture_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except Exception as e:
                errors.append(f"[{filename}] Invalid JSON: {str(e)}")
                continue
                
        # Schema Validation
        required_fields = {
            "domain": str,
            "description": str,
            "entities": list,
            "routes": list,
            "roles": list,
            "tenant_helper": str,
            "public_endpoints": list,
            "dependencies": list
        }
        for field, ftype in required_fields.items():
            if field not in data:
                errors.append(f"[{filename}] Schema Error: Missing required field '{field}'.")
            elif not isinstance(data[field], ftype) and data[field] is not None:
                errors.append(f"[{filename}] Schema Error: Field '{field}' must be of type {ftype.__name__}.")
                
        # Rule: Manifestteki entity modelde yoksa uyar
        for entity in data.get("entities", []):
            if available_models and entity not in available_models:
                warnings.append(f"[{filename}] Entity '{entity}' not found in app.db.models.")
                
        # Rule: Event/notification tanimi eksikse uyar
        if not data.get("events") and not data.get("notifications"):
            warnings.append(f"[{filename}] No events or notifications defined. Are you sure this domain is fully decoupled?")
            
        # Rule: Route manifestte yoksa uyar
        routes = data.get("routes", [])
        if not routes:
            warnings.append(f"[{filename}] No routes defined.")
        else:
            for route in routes:
                route_file = route.replace("app.", "").replace(".", "/") + ".py"
                route_path = os.path.join(os.path.dirname(__file__), "..", "app", route_file.split("app/")[1] if "app/" in route_file else route_file)
                # Just a rough check
                if not os.path.exists(route_path):
                    warnings.append(f"[{filename}] Declared route module '{route}' does not seem to exist.")

        # Rule: Public endpoint + tenant entity + tenant helper yoksa fail
        public_endpoints = data.get("public_endpoints", [])
        tenant_helper = data.get("tenant_helper")
        if public_endpoints and (not tenant_helper or tenant_helper == "None"):
            errors.append(f"[{filename}] P0 Violation: Domain has public endpoints but NO tenant_helper defined.")
            
        # Rule: Upload endpoint + storage prefix yoksa fail
        has_upload = any("upload" in r.lower() or "photo" in r.lower() or "file" in r.lower() for r in public_endpoints)
        if has_upload and not data.get("storage_prefixes"):
            errors.append(f"[{filename}] P1 Violation: Domain has upload-related endpoints but NO storage_prefixes defined.")
            
    print("=== Architecture Linter Report ===")
    if warnings:
        print(f"\n{len(warnings)} Warnings Found:")
        for w in warnings:
            print(f"  [WARN] {w}")
    else:
        print("\nNo warnings.")
        
    if errors:
        print(f"\n{len(errors)} Errors Found:")
        for e in errors:
            print(f"  [ERROR] {e}")
    else:
        print("\nNo errors.")
        
    if strict and errors:
        print("\n[STRICT MODE] Failing due to P0/P1 errors.")
        sys.exit(1)
        
    if not strict and errors:
        print("\n[DEFAULT MODE] Errors found but exiting with 0. Use --strict for CI pipelines.")
        
    sys.exit(0)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Lint architecture manifests.")
    parser.add_argument("--strict", action="store_true", help="Fail with exit code 1 if errors are found.")
    args = parser.parse_args()
    lint_architecture(args.strict)
