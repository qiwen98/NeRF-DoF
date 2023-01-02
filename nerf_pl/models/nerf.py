import torch
from torch import nn
from einops import rearrange, reduce, repeat
import numpy as np

class ConLinear(nn.Module):
    def __init__(self, ch_in, ch_out, is_first=False, bias=True):
        super(ConLinear, self).__init__()
        self.conv = nn.Conv1d(ch_in, ch_out, kernel_size=1, padding=0, bias=bias)
        if is_first:
            nn.init.uniform_(self.conv.weight, -np.sqrt(9 / ch_in), np.sqrt(9 / ch_in))
        else:
            nn.init.uniform_(self.conv.weight, -np.sqrt(3 / ch_in), np.sqrt(3 / ch_in))
    def forward(self, x):
        return self.conv(x)


class SinActivation(nn.Module):
    def __init__(self,):
        super(SinActivation, self).__init__()
    def forward(self, x):
        return torch.sin(x)


class LFF(nn.Module):
    def __init__(self, in_channel, out_channel ):
        super(LFF, self).__init__()
        self.ffm = ConLinear(in_channel,out_channel, is_first=True)
        self.activation = SinActivation()
    def forward(self, x):
        x = self.ffm(x)
        x = self.activation(x)
        return x

class Embedding(nn.Module):
    def __init__(self, in_channels, N_freqs, logscale=True,extra_param_emb=False,is_LFF=False):
        """
        Defines a function that embeds x to (x, sin(2^k x), cos(2^k x), ...)
        in_channels: number of input channels (3 for both xyz and direction)
        """
        super().__init__()
        self.N_freqs = N_freqs
        self.funcs = [torch.sin, torch.cos]
        self.out_channels = in_channels*(len(self.funcs)*N_freqs+1) # (3*(2*10+1)) or (3*(2*4+1))
        self.is_LFF=is_LFF
        if self.is_LFF:
            self.LFF_channels = 64
            self.lff= LFF(self.LFF_channels,1)

        if logscale:
            self.freq_bands = 2**torch.linspace(0, N_freqs-1, N_freqs)
        else:
            self.freq_bands = torch.linspace(1, 2**(N_freqs-1), N_freqs)
        

        if extra_param_emb:
            self.emb= ConstantInput (self.out_channels)
        else: 
            self.emb = None

    def forward(self, x):
        """
        Embeds x to (x, sin(2^k x), cos(2^k x), ...) 
        Different from the paper, "x" is also in the output
        See https://github.com/bmild/nerf/issues/12

        Inputs:
            x: (B, f)

        Outputs:
            out: (B, 2*f*N_freqs+f)
        """
        out = [x]
        for freq in self.freq_bands:
            for func in self.funcs:
                out += [func(freq*x)]

        if self.emb is not None:
            out = torch.cat(out, -1)
            # print(out.shape,'outshape')
            emb = self.emb(x)
            # print(emb.shape,'embshape')
            return torch.cat([out,emb], -1)
        else:
            out = torch.cat(out, -1)
            # 
            if self.is_LFF:
                out = rearrange(out, 'n1 f -> n1 1 f')
                out = out.repeat (1,self.LFF_channels,1) # (n1, c ,f)
                out = self.lff(out) # (n1 1 f)
                out = rearrange(out, 'n1 1 f -> n1 f')
            return out

class ConstantInput(nn.Module):
    """
    Lernable embeddings
    frquency_channel : ( 2*f*N_freqs+f),63 in our case
    input (images) : 5,2,256,256 / 5,2,256,256
    out (embedded images) : 5, 512, 256, 256
    """
    def __init__(self, frequency_channel=63):
        super().__init__()

        self.input = nn.Parameter(torch.randn(1, frequency_channel))

    def forward(self, input):
        batch = input.shape[0]
        out = self.input.repeat(batch, 1 )
        return out

class NeRF(nn.Module):
    def __init__(self,
                 D=8, W=256,
                 in_channels_xyz=63, in_channels_dir=27, 
                 skips=[4]):
        """
        D: number of layers for density (sigma) encoder
        W: number of hidden units in each layer
        in_channels_xyz: number of input channels for xyz (3+3*10*2=63 by default)
        in_channels_dir: number of input channels for direction (3+3*4*2=27 by default)
        skips: add skip connection in the Dth layer
        """
        super(NeRF, self).__init__()
        self.D = D
        self.W = W
        self.in_channels_xyz = in_channels_xyz
        self.in_channels_dir = in_channels_dir
        self.skips = skips

        # xyz encoding layers
        for i in range(D):
            if i == 0:
                layer = nn.Linear(in_channels_xyz, W)
            elif i in skips:
                layer = nn.Linear(W+in_channels_xyz, W)
            else:
                layer = nn.Linear(W, W)
            layer = nn.Sequential(layer, nn.ReLU(True))
            setattr(self, f"xyz_encoding_{i+1}", layer)
        self.xyz_encoding_final = nn.Linear(W, W)

        # direction encoding layers
        self.dir_encoding = nn.Sequential(
                                nn.Linear(W+in_channels_dir, W//2),
                                nn.ReLU(True))

        # output layers
        self.sigma = nn.Linear(W, 1)
        self.rgb = nn.Sequential(
                        nn.Linear(W//2, 3),
                        nn.Sigmoid())

    def forward(self, x, sigma_only=False):
        """
        Encodes input (xyz+dir) to rgb+sigma (not ready to render yet).
        For rendering this ray, please see rendering.py

        Inputs:
            x: (B, self.in_channels_xyz(+self.in_channels_dir))
               the embedded vector of position and direction
            sigma_only: whether to infer sigma only. If True,
                        x is of shape (B, self.in_channels_xyz)

        Outputs:
            if sigma_ony:
                sigma: (B, 1) sigma
            else:
                out: (B, 4), rgb and sigma
        """
        if not sigma_only:
            input_xyz, input_dir = \
                torch.split(x, [self.in_channels_xyz, self.in_channels_dir], dim=-1)
        else:
            input_xyz = x

        xyz_ = input_xyz
        for i in range(self.D):
            if i in self.skips:
                xyz_ = torch.cat([input_xyz, xyz_], -1)
            xyz_ = getattr(self, f"xyz_encoding_{i+1}")(xyz_)

        sigma = self.sigma(xyz_)
        if sigma_only:
            return sigma

        xyz_encoding_final = self.xyz_encoding_final(xyz_)

        dir_encoding_input = torch.cat([xyz_encoding_final, input_dir], -1)
        dir_encoding = self.dir_encoding(dir_encoding_input)
        rgb = self.rgb(dir_encoding)

        out = torch.cat([rgb, sigma], -1)

        return out

