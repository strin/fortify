#!/usr/bin/env python3
"""Setup script for Fortify Scan Agent."""

from setuptools import setup, find_packages
import os


# Read the requirements file
def read_requirements():
    """Read requirements from requirements.txt file."""
    requirements_path = os.path.join(os.path.dirname(__file__), "requirements.txt")
    with open(requirements_path, "r", encoding="utf-8") as f:
        requirements = []
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                requirements.append(line)
    return requirements


# Read the README file for long description
def read_readme():
    """Read README.md for long description."""
    readme_path = os.path.join(os.path.dirname(__file__), "README.md")
    if os.path.exists(readme_path):
        with open(readme_path, "r", encoding="utf-8") as f:
            return f.read()
    return "Fortify Scan Agent - AI-powered security scanning service"


setup(
    name="fortify-scan-agent",
    version="0.1.0",
    description="AI-powered security scanning service for Fortify platform",
    long_description=read_readme(),
    long_description_content_type="text/markdown",
    author="Fortify Team",
    author_email="team@fortify.dev",
    url="https://github.com/strin/fortify",
    packages=find_packages(),
    include_package_data=True,
    install_requires=read_requirements(),
    python_requires=">=3.11",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Security",
        "Topic :: Software Development :: Quality Assurance",
        "Framework :: FastAPI",
    ],
    keywords="security, vulnerability, scanning, ai, claude, fastapi",
    entry_points={
        "console_scripts": [
            "fortify-scan-server=scan_agent.server:main",
            "fortify-scan-worker=scan_agent.workers.scanner:main",
        ],
    },
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.21.0",
            "black>=23.0.0",
            "flake8>=6.0.0",
            "mypy>=1.0.0",
        ],
        "test": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.21.0",
            "httpx>=0.24.0",
        ],
    },
    package_data={
        "scan_agent": ["py.typed"],
    },
    zip_safe=False,
)
