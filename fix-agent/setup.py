from setuptools import setup, find_packages

def read_readme():
    try:
        with open("README.md", "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return "Fortify Fix Agent - AI-powered vulnerability fixing service"

setup(
    name="fortify-fix-agent",
    version="1.0.0",
    description="AI-powered vulnerability fixing service for Fortify security platform",
    long_description=read_readme(),
    long_description_content_type="text/markdown",
    author="Fortify Team",
    author_email="team@fortify.dev",
    url="https://github.com/fortify/fix-agent",
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        "fastapi>=0.104.1",
        "uvicorn>=0.24.0",
        "gunicorn>=21.2.0",
        "prisma>=0.11.0",
        "redis>=5.0.1",
        "hiredis>=2.2.3",
        "httpx>=0.25.2",
        "requests>=2.31.0",
        "claude-code-sdk>=0.2.0",
        "PyGithub>=2.1.1",
        "GitPython>=3.1.40",
        "pydantic>=2.5.0",
        "pydantic-settings>=2.1.0",
        "python-dateutil>=2.8.2",
        "python-multipart>=0.0.6",
    ],
    extras_require={
        "dev": [
            "pytest>=7.4.3",
            "pytest-asyncio>=0.21.1",
        ]
    },
    python_requires=">=3.11",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.11",
        "Topic :: Security",
        "Topic :: Software Development :: Quality Assurance",
        "Topic :: Software Development :: Bug Tracking",
    ],
    entry_points={
        "console_scripts": [
            "fix-agent-server=fix_agent.server:main",
            "fix-agent-worker=fix_agent.workers.fixer:main",
        ],
    },
    keywords="security vulnerability fix ai claude github automation",
)