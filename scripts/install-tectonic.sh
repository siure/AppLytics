#!/bin/bash

# Tectonic Installation Script
# This script installs Tectonic, a modern LaTeX engine
# https://tectonic-typesetting.github.io/

set -e

echo "========================================="
echo "  Tectonic LaTeX Engine Installer"
echo "========================================="
echo ""

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

echo "Detected OS: $OS"
echo "Detected Architecture: $ARCH"
echo ""

install_with_cargo() {
    echo "Installing Tectonic via Cargo..."
    if command -v cargo &> /dev/null; then
        cargo install tectonic
        echo "✓ Tectonic installed successfully via Cargo!"
    else
        echo "✗ Cargo is not installed. Please install Rust first:"
        echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        exit 1
    fi
}

install_with_brew() {
    echo "Installing Tectonic via Homebrew..."
    if command -v brew &> /dev/null; then
        brew install tectonic
        echo "✓ Tectonic installed successfully via Homebrew!"
    else
        echo "✗ Homebrew is not installed. Installing Homebrew first..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        brew install tectonic
    fi
}

install_with_apt() {
    echo "Installing Tectonic via apt (Debian/Ubuntu)..."
    # Tectonic is not in standard repos, use Cargo instead
    echo "Tectonic is not available in apt repositories."
    echo "Falling back to Cargo installation..."
    
    # Install Rust if not present
    if ! command -v cargo &> /dev/null; then
        echo "Installing Rust..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source "$HOME/.cargo/env"
    fi
    
    install_with_cargo
}

install_with_pacman() {
    echo "Installing Tectonic via pacman (Arch Linux)..."
    sudo pacman -S tectonic
    echo "✓ Tectonic installed successfully via pacman!"
}

install_binary() {
    echo "Installing Tectonic binary directly..."
    
    # Determine the correct binary URL
    local VERSION="0.15.0"
    local BINARY_URL=""
    
    case "$OS-$ARCH" in
        Linux-x86_64)
            BINARY_URL="https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${VERSION}/tectonic-${VERSION}-x86_64-unknown-linux-gnu.tar.gz"
            ;;
        Linux-aarch64)
            BINARY_URL="https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${VERSION}/tectonic-${VERSION}-aarch64-unknown-linux-gnu.tar.gz"
            ;;
        Darwin-x86_64)
            BINARY_URL="https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${VERSION}/tectonic-${VERSION}-x86_64-apple-darwin.tar.gz"
            ;;
        Darwin-arm64)
            BINARY_URL="https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${VERSION}/tectonic-${VERSION}-aarch64-apple-darwin.tar.gz"
            ;;
        *)
            echo "✗ No pre-built binary available for $OS-$ARCH"
            echo "Please install via Cargo instead."
            install_with_cargo
            return
            ;;
    esac
    
    echo "Downloading Tectonic ${VERSION}..."
    local TMP_DIR=$(mktemp -d)
    curl -L "$BINARY_URL" -o "$TMP_DIR/tectonic.tar.gz"
    
    echo "Extracting..."
    tar -xzf "$TMP_DIR/tectonic.tar.gz" -C "$TMP_DIR"
    
    echo "Installing to /usr/local/bin..."
    sudo mv "$TMP_DIR/tectonic" /usr/local/bin/
    sudo chmod +x /usr/local/bin/tectonic
    
    rm -rf "$TMP_DIR"
    echo "✓ Tectonic installed successfully!"
}

# Main installation logic
case "$OS" in
    Darwin)
        echo "macOS detected."
        echo ""
        echo "Choose installation method:"
        echo "  1) Homebrew (recommended)"
        echo "  2) Cargo (Rust)"
        echo "  3) Pre-built binary"
        read -p "Enter choice [1-3]: " choice
        
        case $choice in
            1) install_with_brew ;;
            2) install_with_cargo ;;
            3) install_binary ;;
            *) install_with_brew ;;
        esac
        ;;
        
    Linux)
        echo "Linux detected."
        
        # Check for package manager
        if command -v pacman &> /dev/null; then
            install_with_pacman
        elif command -v apt &> /dev/null; then
            install_with_apt
        else
            echo ""
            echo "Choose installation method:"
            echo "  1) Cargo (Rust) - recommended"
            echo "  2) Pre-built binary"
            read -p "Enter choice [1-2]: " choice
            
            case $choice in
                1) install_with_cargo ;;
                2) install_binary ;;
                *) install_with_cargo ;;
            esac
        fi
        ;;
        
    MINGW*|MSYS*|CYGWIN*)
        echo "Windows detected."
        echo "Please use one of these methods:"
        echo ""
        echo "1. Using Cargo (requires Rust):"
        echo "   cargo install tectonic"
        echo ""
        echo "2. Using Chocolatey:"
        echo "   choco install tectonic"
        echo ""
        echo "3. Download from GitHub releases:"
        echo "   https://github.com/tectonic-typesetting/tectonic/releases"
        exit 0
        ;;
        
    *)
        echo "Unknown OS: $OS"
        echo "Please install manually from:"
        echo "https://tectonic-typesetting.github.io/book/latest/installation.html"
        exit 1
        ;;
esac

echo ""
echo "========================================="
echo "  Verifying Installation"
echo "========================================="
echo ""

if command -v tectonic &> /dev/null; then
    echo "✓ Tectonic is installed!"
    tectonic --version
    echo ""
    echo "First run may take a moment as Tectonic downloads its bundle."
    echo "You can test it with:"
    echo "  echo '\\documentclass{article}\\begin{document}Hello\\end{document}' | tectonic -"
else
    echo "✗ Tectonic installation could not be verified."
    echo "Please check the installation manually."
    exit 1
fi
