import sys
import os

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Add the apps/backend directory to sys.path so we can import app
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.insert(0, backend_dir)

from app.main import app
from fastapi.routing import APIRoute

def generate_inventory():
    output_path = os.path.join(backend_dir, "docs", "api_inventory.md")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("# GOLABS ERP — API Inventory\n\n")
        f.write("Bu doküman otomatik olarak üretilmiştir. API route'larının genel dökümünü içerir.\n\n")
        
        f.write("## Endpoints\n\n")
        f.write("| Method | Path | Tags | Auth Required | Name |\n")
        f.write("|---|---|---|---|---|\n")
        
        routes = sorted([r for r in app.routes if isinstance(r, APIRoute)], key=lambda x: x.path)
        
        for r in routes:
            methods = ", ".join(r.methods - {"OPTIONS"})
            tags = ", ".join(r.tags) if getattr(r, 'tags', None) else ""
            deps = [d.dependency.__name__ if hasattr(d.dependency, '__name__') else str(d.dependency) for d in r.dependencies]
            
            auth_required = "Yes" if "get_current_user" in deps or any("require_role" in d for d in deps) else "No/Unknown"
            if "public" in tags.lower() or "webhooks" in tags.lower():
                auth_required = "No (Public)"
                
            f.write(f"| {methods} | `{r.path}` | {tags} | {auth_required} | {r.name} |\n")
            
    print(f"API Inventory generated successfully at {output_path}")

if __name__ == "__main__":
    generate_inventory()
