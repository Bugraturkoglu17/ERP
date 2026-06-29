import os
import json
import sys

# Ensure UTF-8 output
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
architecture_dir = os.path.join(backend_dir, "architecture")
docs_dir = os.path.join(backend_dir, "docs")
os.makedirs(docs_dir, exist_ok=True)

def load_manifests():
    manifests = []
    if not os.path.exists(architecture_dir):
        print(f"Directory not found: {architecture_dir}")
        return manifests

    for filename in os.listdir(architecture_dir):
        if filename.endswith(".json"):
            filepath = os.path.join(architecture_dir, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                try:
                    manifests.append(json.load(f))
                except json.JSONDecodeError as e:
                    print(f"Error decoding JSON in {filename}: {e}")
    
    # Sort by domain name
    manifests.sort(key=lambda x: x.get("domain", ""))
    return manifests

def generate_registry(manifests):
    output_path = os.path.join(docs_dir, "architecture_registry.md")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("# GOLABS ERP — Architecture Registry\n\n")
        f.write("Bu doküman `architecture/` dizinindeki manifest dosyalari (JSON) okunarak otomatik olarak uretilmistir.\n\n")
        
        for m in manifests:
            domain = m.get("domain", "Unknown")
            f.write(f"## Domain: {domain.title().replace('_', ' ')}\n\n")
            f.write(f"**Description:** {m.get('description', '')}\n\n")
            
            f.write("### Entities\n")
            entities = m.get("entities", [])
            f.write(", ".join([f"`{e}`" for e in entities]) if entities else "None")
            f.write("\n\n")
            
            f.write("### Endpoints / Routes\n")
            routes = m.get("routes", [])
            f.write(", ".join([f"`{r}`" for r in routes]) if routes else "None")
            f.write("\n\n")
            
            f.write("### Security & Roles\n")
            roles = m.get("roles", [])
            f.write(f"- **Allowed Roles:** {', '.join(roles) if roles else 'None'}\n")
            f.write(f"- **Tenant Helper:** `{m.get('tenant_helper', 'None')}`\n")
            f.write("\n")
            
            f.write("### Events & Notifications\n")
            f.write(f"- **Emitted Events:** {', '.join(m.get('events', [])) if m.get('events') else 'None'}\n")
            f.write(f"- **Notifications:** {', '.join(m.get('notifications', [])) if m.get('notifications') else 'None'}\n")
            f.write("\n")
            
            f.write("### Storage & Database\n")
            f.write(f"- **Storage Prefixes:** {', '.join(m.get('storage_prefixes', [])) if m.get('storage_prefixes') else 'None'}\n")
            f.write(f"- **Indexes:** {', '.join(m.get('indexes', [])) if m.get('indexes') else 'None'}\n")
            f.write("\n")
            
            public = m.get("public_endpoints", [])
            if public:
                f.write("### Public Endpoints (No Auth)\n")
                for p in public:
                    f.write(f"- `{p}`\n")
                f.write("\n")
                
            f.write("---\n\n")
    print(f"Generated {output_path}")

def generate_dependency_graph(manifests):
    output_path = os.path.join(docs_dir, "dependency_graph.md")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("# GOLABS ERP — Domain Dependency Graph\n\n")
        f.write("Bu grafik `architecture/` JSON'larindaki `dependencies` tanimlarina gore uretilmistir.\n\n")
        f.write("```mermaid\n")
        f.write("graph TD;\n")
        
        for m in manifests:
            domain = m.get("domain")
            if not domain:
                continue
            deps = m.get("dependencies", [])
            # Create node
            f.write(f"    {domain}[\"{domain.title().replace('_', ' ')}\"];\n")
            for d in deps:
                f.write(f"    {domain} --> {d};\n")
                
        f.write("```\n")
    print(f"Generated {output_path}")

if __name__ == "__main__":
    manifests = load_manifests()
    generate_registry(manifests)
    generate_dependency_graph(manifests)
