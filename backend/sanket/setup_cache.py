from pathlib import Path

from transformers import AutoModel, AutoTokenizer, T5ForConditionalGeneration


ROOT = Path(__file__).resolve().parent
CACHE = ROOT / "cache"

CACHE.mkdir(parents=True, exist_ok=True)

print("Downloading T5 tokenizer and decoder...")
tokenizer = AutoTokenizer.from_pretrained("t5-base")
decoder = T5ForConditionalGeneration.from_pretrained("t5-base")
tokenizer.save_pretrained(CACHE / "t5-base")
decoder.save_pretrained(CACHE / "t5-base")

print("Downloading TimeSformer vision encoder...")
vision = AutoModel.from_pretrained("facebook/timesformer-base-finetuned-k400")
vision.save_pretrained(CACHE / "timesformer")

print("Sanket base models are ready.")
