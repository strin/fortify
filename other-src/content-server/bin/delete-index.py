import os
import argparse
from pinecone import Pinecone

# Initialize Pinecone client
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENV = os.getenv("PINECONE_API_ENV")

if not PINECONE_API_KEY or not PINECONE_ENV:
    raise ValueError("PINECONE_API_KEY and PINECONE_API_ENV must be set in environment variables")

pinecone = Pinecone(api_key=PINECONE_API_KEY)

def delete_namespace(index_name, namespace_prefix):
    index = pinecone.Index(index_name)
    
    # List all namespaces
    namespaces = index.describe_index_stats()['namespaces']
    
    for namespace in namespaces:
        if namespace.startswith(namespace_prefix):
            print(f"Deleting namespace: {namespace}")
            index.delete(namespace=namespace, delete_all=True)
    
    print("Deletion complete")

def main():
    parser = argparse.ArgumentParser(description="Delete Pinecone index namespaces")
    parser.add_argument("--index", default="creators", help="Name of the Pinecone index")
    parser.add_argument("--namespace", default="users/5", help="Namespace prefix to delete")
    args = parser.parse_args()

    delete_namespace(args.index, "users/5")

if __name__ == "__main__":
    main()
