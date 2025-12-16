import sys
import os

# Add the parent directory to sys.path to allow importing from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base
# Import all models to ensure they are registered
from models import User, Category, Class, Subject, Material, University, Degree, Branch, Year, UniversitySubject, UniversityMaterial, Notification

def generate_mermaid():
    output_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "er_diagram.mmd")
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("erDiagram\n")
        
        # Sort tables for consistent output
        sorted_tables = sorted(Base.metadata.tables.items())
        
        for table_name, table in sorted_tables:
            # Clean table name if needed
            safe_name = table_name.replace(" ", "_")
            f.write(f"    {safe_name} {{\n")
            for column in table.columns:
                # Simplified type mapping for display
                col_type = str(column.type).split('(')[0]
                # Mark PK/FK
                modifiers = ""
                if column.primary_key:
                    modifiers = " PK"
                elif column.foreign_keys:
                    modifiers = " FK"
                    
                f.write(f"        {col_type} {column.name}{modifiers}\n")
            f.write("    }\n")
            
        f.write("\n")
        
        for table_name, table in sorted_tables:
            safe_name = table_name.replace(" ", "_")
            for fk in table.foreign_keys:
                target_table = fk.column.table.name.replace(" ", "_")
                # Default to one-to-many notation for FKs
                f.write(f"    {target_table} ||--o{{ {safe_name} : contains\n")
                
    print(f"Generated Mermaid ER diagram at: {output_path}")

if __name__ == "__main__":
    generate_mermaid()
