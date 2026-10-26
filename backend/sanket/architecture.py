import torch
import torch.nn as nn
from transformers import AutoModel, T5ForConditionalGeneration
import pandas as pd
import os
import sys


class PoseEncoder(nn.Module):
    """
    Lightweight Temporal Encoder for the MediaPipe 3D coordinate stream.
    Transforms shape [Batch, Frames, 195] into [Batch, Frames, Hidden_Dim].
    """
    def __init__(self, input_dim=195, hidden_dim=768, num_layers=2):
        super().__init__()
        self.fc_in = nn.Linear(input_dim, hidden_dim)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim, nhead=8, dim_feedforward=2048,
            dropout=0.1, batch_first=True
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)

    def forward(self, poses, src_key_padding_mask=None):
        x = self.fc_in(poses)
        x = self.transformer(x, src_key_padding_mask=src_key_padding_mask)
        return x


class GatedCrossModalFusion(nn.Module):
    """
    Intelligently merges TimeSformer features (RGB) with PoseEncoder features.
    Learns to dynamically weight which stream is more important frame-by-frame.
    """
    def __init__(self, dim=768):
        super().__init__()
        self.visual_gate = nn.Linear(dim * 2, dim)
        self.pose_gate   = nn.Linear(dim * 2, dim)
        self.sigmoid     = nn.Sigmoid()
        self.out_proj    = nn.Linear(dim * 2, dim)

    def forward(self, vis_features, pose_features):
        concat_feat = torch.cat((vis_features, pose_features), dim=-1)
        vis_g  = self.sigmoid(self.visual_gate(concat_feat))
        pose_g = self.sigmoid(self.pose_gate(concat_feat))
        gated_vis  = vis_features * vis_g
        gated_pose = pose_features * pose_g
        fused = torch.cat((gated_vis, gated_pose), dim=-1)
        return self.out_proj(fused)


class DualStreamGMTFormer(nn.Module):
    def __init__(self, t5_model_name='t5-base'):
        super().__init__()

        print("[*] Initializing TimeSformer Vision Encoder...", file=sys.stderr)
        cache_dir = os.path.join(os.path.dirname(__file__), 'cache')
        self.video_encoder = AutoModel.from_pretrained(os.path.join(cache_dir, 'timesformer'))
        visual_out_dim = self.video_encoder.config.hidden_size  # 768

        print("[*] Initializing PoseEncoder...", file=sys.stderr)
        self.pose_encoder = PoseEncoder(input_dim=195, hidden_dim=visual_out_dim)

        print("[*] Initializing T5 Language Decoder...", file=sys.stderr)
        self.text_decoder = T5ForConditionalGeneration.from_pretrained(os.path.join(cache_dir, 't5-base'))

        self.fusion     = GatedCrossModalFusion(dim=visual_out_dim)
        self.dim_mapper = nn.Linear(visual_out_dim, self.text_decoder.config.d_model)
        self.pre_t5_dropout = nn.Dropout(p=0.3)

        # Build vocabulary for constrained decoding (allows model to only predict INCLUDE words)
        print("[*] Building INCLUDE Vocabulary for Constrained Decoding...", file=sys.stderr)
        self.vocab_list = []
        # Load vocabulary from local isolated CSV copy
        csv_path = os.path.join(os.path.dirname(__file__), 'INCLUDE_Labels.csv')
        if os.path.exists(csv_path):
            df = pd.read_csv(csv_path)
            self.vocab_list = sorted(list(df['Label'].unique()))
            print(f"[*] Vocabulary loaded: {len(self.vocab_list)} unique signs", file=sys.stderr)
        else:
            print(
                f"[!] Warning: CSV not found at {csv_path}. No vocabulary constraint will be applied.",
                file=sys.stderr,
            )

    def forward(self, video_frames, pose_data):
        """Pure inference forward pass — returns fused embeddings."""
        b, t, c, h, w = video_frames.shape

        video_outputs = self.video_encoder(pixel_values=video_frames)
        vis_features  = video_outputs.last_hidden_state  # [B, T*196+1, 768]

        vis_feat_no_cls  = vis_features[:, 1:, :]
        vis_feat_reshaped = vis_feat_no_cls.view(b, t, -1, vis_feat_no_cls.shape[-1])
        vis_frame_level  = vis_feat_reshaped.mean(dim=2)  # [B, T, 768]

        # Pose padding mask — ignores zero-padded frames from short clips
        pose_mask = (pose_data.abs().sum(dim=-1) == 0)
        # Avoid an empty nested tensor when a clip contains no detectable pose.
        all_padding = pose_mask.all(dim=1)
        if all_padding.any():
            pose_mask = pose_mask.clone()
            pose_mask[all_padding, 0] = False
        pose_features = self.pose_encoder(pose_data, src_key_padding_mask=pose_mask)  # [B, T, 768]

        fused_features = self.fusion(vis_frame_level, pose_features)  # [B, T, 768]
        encoder_hidden_states = self.pre_t5_dropout(self.dim_mapper(fused_features))  # [B, T, 768]

        return encoder_hidden_states

    def generate_translation(self, video_frames, pose_data, tokenizer, max_length=20):
        """
        Runs dual-stream forward pass and decodes output tokens into English text.
        Uses beam search with constrained vocabulary to only predict INCLUDE signs.
        """
        encoder_hidden_states = self.forward(video_frames, pose_data)

        # Build allowed token IDs from INCLUDE vocabulary (constrained decoding)
        # Prevents T5 from hallucinating words never seen in training
        def prefix_allowed_tokens_fn(batch_id, input_ids):
            if not getattr(self, "allowed_tokens_list", None):
                if not self.vocab_list:
                    return list(range(self.text_decoder.config.vocab_size))
                
                allowed = []
                for word in self.vocab_list:
                    allowed.extend(tokenizer.encode(word, add_special_tokens=False))
                    allowed.extend(tokenizer.encode(" " + word, add_special_tokens=False))
                
                allowed.extend([tokenizer.pad_token_id, tokenizer.eos_token_id, tokenizer.unk_token_id])
                self.allowed_tokens_list = list(set(allowed))
                
            return self.allowed_tokens_list

        generate_kwargs = dict(
            inputs_embeds=encoder_hidden_states,
            max_new_tokens=10,
            num_beams=4,
            early_stopping=True,
            no_repeat_ngram_size=2,
            length_penalty=1.0,
            prefix_allowed_tokens_fn=prefix_allowed_tokens_fn
        )

        generated_ids = self.text_decoder.generate(**generate_kwargs)

        # Decode token IDs back to English text directly
        translated_text = tokenizer.decode(generated_ids[0], skip_special_tokens=True).strip()
        return translated_text
