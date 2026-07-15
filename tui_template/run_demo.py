import sys
from pathlib import Path

# Add current folder to sys.path so 'tui' package can be imported
sys.path.insert(0, str(Path(__file__).parent.resolve()))

from tui import PostingTUI
from mock_backend import MockBackend

def main():
    """Launch the standalone decoupled TUI template."""
    print("Launching Posting TUI Template...")
    backend = MockBackend()
    app = PostingTUI(backend=backend)
    app.run()

if __name__ == "__main__":
    main()
