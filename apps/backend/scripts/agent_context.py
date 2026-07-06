import sys
import os
import argparse
import json

def get_backend_dir():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load_json(filepath):
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except:
                return {}
    return {}

def cmd_domain(args):
    domain = args.domain
    filepath = os.path.join(get_backend_dir(), "architecture", f"{domain}.json")
    if not os.path.exists(filepath):
        print(f"Domain '{domain}' not found in architecture registry.")
        sys.exit(1)
        
    data = load_json(filepath)
    print(f"=== Domain Summary: {domain} ===")
    print(f"Description: {data.get('description', '')}")
    print(f"Entities: {', '.join(data.get('entities', []))}")
    print(f"Routes: {', '.join(data.get('routes', []))}")
    print(f"Roles: {', '.join(data.get('roles', []))}")
    print(f"Tenant Helper: {data.get('tenant_helper', 'None')}")
    print(f"Dependencies: {', '.join(data.get('dependencies', []))}")

def cmd_impact(args):
    # To run impact analysis without API dependency, we can just call the core logic
    sys.path.insert(0, get_backend_dir())
    from app.core.impact import perform_impact_analysis
    
    result = perform_impact_analysis(
        entity=args.entity, 
        domain=args.domain, 
        route=args.route, 
        event=args.event
    )
    
    print(json.dumps(result, indent=2, ensure_ascii=False))

def cmd_security(args):
    print("=== Security Matrix Overview ===")
    print("For full matrix, refer to GET /api/v1/meta/security-matrix endpoint.")
    
    arch_dir = os.path.join(get_backend_dir(), "architecture")
    if not os.path.exists(arch_dir):
        print("Architecture registry not found.")
        return
        
    print("\n[Domain Access Rules]")
    for filename in os.listdir(arch_dir):
        if filename.endswith(".json") and filename not in ["events.json", "tasks.json"]:
            data = load_json(os.path.join(arch_dir, filename))
            print(f"- {data.get('domain')}:")
            print(f"    Roles: {data.get('roles', [])}")
            print(f"    Tenant Isolation: {data.get('tenant_helper')}")
            
    print("\n[Public Endpoints]")
    for filename in os.listdir(arch_dir):
        if filename.endswith(".json") and filename not in ["events.json", "tasks.json"]:
            data = load_json(os.path.join(arch_dir, filename))
            public = data.get("public_endpoints", [])
            if public:
                for p in public:
                    print(f"  - {p} (from {data.get('domain')})")


def cmd_modules(args):
    backend_dir = get_backend_dir()
    registry_dir = os.path.join(backend_dir, "registry")
    modules = load_json(os.path.join(registry_dir, "modules.json")) or []
    features = load_json(os.path.join(registry_dir, "features.json")) or []
    quotas = load_json(os.path.join(registry_dir, "quotas.json")) or []
    print("=== Module Registry v2 ===")
    print(f"Modules: {len(modules)}")
    print(f"Features: {len(features)}")
    print(f"Quotas: {len(quotas)}")
    backend_enforced_modules = {"documents", "work_orders", "finance"}
    visibility_modules = {"projects", "approvals", "inventory", "procurement", "field_reports", "whatsapp", "users", "notifications"}
    for module in modules:
        module_id = module.get("id")
        features_for_module = [f.get("id") for f in features if f.get("module_id") == module_id]
        enforcement = "backend_enforced" if module_id in backend_enforced_modules else "visibility_only" if module_id in visibility_modules else "none"
        print(f"- {module.get('id')} [{module.get('category')}/{module.get('plan_tier')}]")
        print(f"    Dependencies: {', '.join(module.get('dependencies', [])) or 'None'}")
        print(f"    Routes: {', '.join(module.get('routes', [])) or 'None'}")
        print(f"    Features: {', '.join(features_for_module) or 'None'}")
        print(f"    Quotas: {', '.join(q.get('id') for q in quotas) if module_id in backend_enforced_modules else 'None'}")
        print(f"    Enforcement: {enforcement}")

def cmd_bootstrap(args):
    print("=== GOLABS ERP Bootstrap Sequence Initiated ===")
    root_dir = os.path.dirname(os.path.dirname(get_backend_dir()))
    docs_to_check = [
        os.path.join(root_dir, "docs", "AGENT_BOOTSTRAP.md"),
        os.path.join(get_backend_dir(), "docs", "architecture_registry.md"),
        os.path.join(get_backend_dir(), "docs", "dependency_graph.md")
    ]
    
    for doc in docs_to_check:
        if os.path.exists(doc):
            print(f"[OK] Found {os.path.basename(doc)}")
        else:
            print(f"[WARN] Missing {doc}")
            
    print("\nNext steps for Agent: Read the above docs, then run `agent_context.py security` and `agent_context.py domain <name>` for deeper context.")

def main():
    parser = argparse.ArgumentParser(description="GOLABS ERP Agent Tooling SDK")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Bootstrap command
    parser_bootstrap = subparsers.add_parser("bootstrap", help="Run initial agent context checks")
    
    
    # Domain command
    parser_domain = subparsers.add_parser("domain", help="Get summary for a specific domain")
    parser_domain.add_argument("domain", type=str, help="Name of the domain (e.g. work_orders)")
    
    # Impact command
    parser_impact = subparsers.add_parser("impact", help="Perform impact analysis")
    parser_impact.add_argument("--entity", type=str, help="Entity name")
    parser_impact.add_argument("--domain", type=str, help="Domain name")
    parser_impact.add_argument("--route", type=str, help="Route name")
    parser_impact.add_argument("--event", type=str, help="Event name")
    
    # Security command
    parser_security = subparsers.add_parser("security", help="Get overview of domain security and public endpoints")

    # Module registry command
    parser_modules = subparsers.add_parser("modules", help="Get module, feature and quota registry overview")
    
    args = parser.parse_args()
    
    if args.command == "bootstrap":
        cmd_bootstrap(args)
    elif args.command == "domain":
        cmd_domain(args)
    elif args.command == "impact":
        cmd_impact(args)
    elif args.command == "security":
        cmd_security(args)
    elif args.command == "modules":
        cmd_modules(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
