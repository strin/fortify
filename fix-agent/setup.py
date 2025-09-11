"""Setup script for fix-agent package."""

from setuptools import setup, find_packages

with open("requirements.txt") as f:
    requirements = f.read().splitlines()

setup(
    name="fortify-fix-agent",
    version="1.0.0",
    description="AI-powered vulnerability fixing service",
    packages=find_packages(),
    install_requires=requirements,
    python_requires=">=3.11",
    entry_points={
        "console_scripts": [
            "fix-agent=fix_agent.server:main",
            "fix-worker=fix_agent.workers.fixer:main",
        ],
    },
    include_package_data=True,
    package_data={
        "fix_agent": ["py.typed"],
    },
)