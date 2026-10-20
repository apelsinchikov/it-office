// Модульные персонажи в стиле Б и их анимация.
// Все координаты — в «единицах персонажа» рисунка 120×220 (как на холсте). Ноги стоят в точке (60, 204).

import { Container, Graphics, Texture, Sprite as PixiSprite } from 'pixi.js';
import { OUT, circle, ellipse, line, p, rect, shade, stroke } from './draw';

/** Data URL для фото-лица тестировщика (используется как src изображения в main.ts). */
export const FACE_TEXTURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAPKADAAQAAAABAAAAPAAAAACL3+lcAAAitklEQVRoBUWbWYxk2XGe4+a9uW+VWXsv1ezuqemebmIWajSkRUokLYCENhOGIcq0BFAciNQC+ElPtvVAGH4zoAc/2IIN2ICgFwswbMACBFCCFlOiNnI042HP2tPd1V17ZlXlvtzMvNffHzll5SAnszNv3nNOxB9//BHnVPDNX/vVNMpkLV8uWZIkNu4PbDKZ2MnxsY1GI5vNptbv9+38/NzG47H1egNL09R2dnZsbW3NonxkKysr/lmpVLIgCOzxR09sdXXdxtOBVSoVOzs7s2Q2t1arZdWVumUyGZtN5xbHseXzeVtdb/r7kM9173yhYJ2LC8uEoc3nc8tms3ZwcGAD5jFhDpaaj6Nri8Wij5/L5UyPmzdvWjFf8LkNh0PT5xonmzHmP7TgV371W+lqY80OT0+sWizZD99+2+LJ1PYPn1nIgEdHJ3b//n3b3d21yXRqi2Rq4+HIoiiydrtt89nMBoOBNao1f9WCLUltOOpbvVDyCWtiszSxHBOf9Ec+ifEixpgzq9dqNuW+CdeMpzNbLBZWYMH5YsE/z/JarVb98+Fo4gut1SpuSC3k0aMndoFxokzoc5LxwygwGf/K9jVrNpfGbDTrtpiMLfiFr/3zVB++++67WLXnlu31evaN11+3brdrJ+fHdvD0wDJphpsU7PjZE8uVimZxYuVsHo8zWLqwZr1suQCkRFlLw8QnmGUSMpqe8zmLAkFBjINYXKaAyXnIg8ki8M9ivtfiZbSFBW6EuTzDZ6Px3KaLueUZuw1iZBTdd/v6jiOxDJJOT9uOhCgMrIYhV1cb3Mvs6tUdm40njtbgS1/6Uiq4CG6f/eyPWxYIdDodu3Xzhj358KHtHz+zAIiX8wx0fGDXtjfxFDfMVayGB4NgbjkmL4/P4pkFmcCyaeCwnfOqhxbIkv19ABz1CILQX+XRMATii5nN09DDSZAPFgm/WF6s2yzmoIZJx8bnfDCczKwH0uZ8N57E1puCHOZYAa2rjaa98847oGwIEkpWr1dBb4XxMPid52+mtXrTXnzlU9Y+OcXDZ/b00Ue2WqvatHNh6426FbNmVWI8H+bc+sVCztJ5YgW8mWRSj7EIUypeNFktUN4UzPReHpsni6WHg4V/xv+Wr5oG1wrSKSiazWL/fGFLBMgqi0XqSJjhYf834RETNs45k4VdDPo2mMxtEM9txs9mzE0O2L5+zT744AO/rlGtWLlctuAbX/9lfr6wdx48sCCJbU6cDM7O7fbVTdtcrVspwtpMWMSRweqCUsK/5R95K4t3tMiEf2sCgpke7qWPF6VF6zklZheMoXvlwshhLw/rWsxg03hplATjXH7unMD9ZjO+Y1zdRwtf8EwwyhwyZFgbz5k7hjmAV9r9iS2yGJ+5iFg1r/fe+8A2NtYs+OLnfjydzyeWJnM7efrIbl7bttV6zbYgoSITyxdzhj+t0Wh4rHnsQAqalOIvmANjJqKHYjGTiTzWh8OBf64JaoFiel0XgAgxs+KyiPEuCJ94NgEBZsNB/P+NEOUwojyPKTKYV4vSvyeMt+BVhs3IaLhLqMikEQZl0cx1ANzbvbFdYIRFglGmQ8vmy0500Xw2hjk7ljCBe7u3bLNRg3ErVs0VrAH+S8W8U//aWtPqEIN7kwG1WMEm4L3YNsIIU1LNlHjSZGazmr+KhLTozY2mE1KecNA9xPj6XbmUB4LE5oz7QIRajJgfU3oaUYrUWDFwZcmMw/KJdRkvxLiGo0LmuuD7MowODtzAZeadHp/ZHum0ulL13yZcG7VPD8UI9uLuDdtcW7UtmG2bxRWZdB1G3NhcsVIh7yklE0RYOWXQ5YA+cWJIk4LHbBpObYjFwzBrMf9OMUAOLyp+Z4sx99EkWQj5WejJMYYVoLM4Z8Pp2GZ5eTNigQsfYzYr+2/nwD7i2jlEJ22Q5Z6TaexpkBszp4DrIxtDmvq+TEp2h1zLOHr2zi5sG7IdT/oWtc66duf6li/2eZj5anMFMgqtBkmt8j6FZAq5LJ4gp+IFPbL5nENPebBO3qswoSwD6qHFy3NK+gGkJaOAYlsAN3l7ARsvOjMbj2IrcJ8uKVAIyGFU3MhEZ1arlm0ST/GkkebyLizk0ZT0N5/XnByzWRZNXp0TRlMgLC1wftG1aYm5gRKNZX0E0ua69ccze/Zk357bvWnRGCEgDyZAe2eraU3BGNhV8W4+Dz0TG5cqpljGWx9DOZsjBVSBNFbXZLRIfZcHos1Sgwn0+R1wxXM9hIHirFiKsHiKIZuWrCQey2sbq8T+AsIiQQNHPRyuQonuB0zF9griRbBcSJb87w8gOkWsREVifJGzfK5pI4zQvujADzByNjKhvjca295pxw0W1Qly+MHWag2rFopWY8ErxLCIRd7J4115Ul7QgkRAEeknwPJ6BEwsS3rKAKcM3wcSCgwQIFdjvCQpKKIrl2pOXJkMaOD3upeMFDCGHgXGC0GJkOKEhIgJQYDCQcpNeXmMUySD9ZnmpPmFEJe8KaeI1MT2NbhGHi8z9yIsvXfSsatwSIggib587xZqqm3bV34MGOdQTLAz+lQ5h3C0GOtrFSmDZPG4JuUw5daKm1h4hUgw9tIz/LNUKnvamE8ZgLjV4GlmaSwtwkkNESFtLgMqDPTZcNz3V5GjUm5CvOdkEIxtAls2dOSEGCPL5FOe8bwL/JGcEJmjjNiukW/nvCqThFEJj7dstTCx//Lvfssyv/LLX8ejNRsNhtZYqblnE2LFF8Vg8oY8VOImymt6XMJXuTIdzWxC7Iy7fZtyj4D8Iq09ZUEiENe5GEZe0FOLlHdkLD2FHE1MaKhVVrRKj+9/YGc0t9CgJ4vIA+eM1ByG0n30qvnpPo5IkKJ5SX/jAshwYL/0z37G/vt//vfWOtizqFop2te++lV72n5KnirzQ3KfkjrwcNoHqgsGcM9gRXliPGQxgzHvmXSiHDnjCWEB5Vmmh+LR4iZWIjQGg5EdH5/67xSbuRye7PfccBorUAzw0CQHg6VGdpHBDeVhLcYJkN/GGFHejjGQ7qXfag5JMnHjed5WmPCd5CoXW1Sq2F9/529tetyzH/n8Hf4NrV/Z2rTGJhbhZu41oZS8KquJFC4oKtbX12xw3sXCsCCLjlmcigt5W7/JavHyGlYl4ondmGrqzBcqbzEHv1bXaEKXHlEsa2F6KIQC+KBDiarJF9Dq3c7yPUMwTgyEZ5ZlEf3+kt1DfpQnbLJwSl6IYV5Ka7pviLESyLJOpQRbcvOcRVeuXbV+98y1siZxSSYZ2FcaVmLigoWO8GqSziyURwRbbnTaPsXqVEqw7kWflIAHRB6qdfVbTUaQ02rTjxXWggnJQAkpTqpLcA5Igx5CxGaPsFDoRIxzcUFMYwAZdoTkLcEvYMm6+089VanIKfLbZnPNJoOWl4TTeGQT7q8x8twvXkxsrYlKzEwtUyLLH7SOqDp6dmvzhqUfQ3mER5TbWJPDR8rHkHfj8cjLr3pjxQ6PjlyMv/HmD+3mnV25xt56800rkEa6pAWXonhptd6wHJMuQTjN1RXIZSns5XUtUkZOpiAChZYiIGYYYEERcXJyYiFpZQqfCLoDQkhNgVoNPYCIWV9dtwLGnGLgEfU72c4K3LOEfpiOYWg4Z0TOD5lXgRq+gERWSET7D59aa9az3XufcKu49bHOjMn2uUAwGw5hUy9kVZxzw9EC9izY/pNDGLFup89OLENpZsTz6soGpDO1an3FxsRvDJTG3CezQuejfUHuLmDFqYeAxlJITICgQmfM5106Kl1+p9jtU7mFOSmoJQldv7FjJyjD/rBPTq+4kfr9Q7u+c93HVKHQ7/WtRCaQAZmQa+te68w2tnbIAtTav/Oz/zjtjLr2td98HZIihrHyeadnh8ct4kQk8Q/xpoQ/pwyTwpEgwSakBjwE1BN0cIpFEddEMGUeCi0E1tLAumeaIuv5XvldTyJy6TmgqrbRRHDCG2JeiZQIVEQF/s0gEjBFujERC88Qp05zxP1wTg3MdRkQsAAZehU/5As0IaiilNHk4XIc2q3XaP3UieGSOgWdFhNYPi6eHVkBSs8SR1I/qlGVSsSUB/st6xKDD4+O+UydiBg5d4q2zVGSxbZVjuwn/tGP2gs711jslEmrdBSZURcTEoDVB9GiuD0GW/a1YkJJclBsr7JPUMcczvBzJhzOQzuGpFrohRDSaoKePJ4vEya1OgtmYRkECaj2+7gIIlSUUZxTQGh3MrTu+NyiOy9+0vbax16CMZo1tjc8pVSQiDUsvHdwZu1W186IH3UdBqO5rUTk5Xpo13Zftt//X39gJVBwbXsdtRXbn/7Z31j7UyM739+3T92769UQBE6lVUaT84aFpoyTquJBPYmNBesx8TcmfhQC6mZ0zsnXeHYCgh49eGg9rotY2Va9aLfvwhMfta3VPrRXX7xr407fdj5xDSKjQSgBviBuZQXFI48Tioc71Xs2JHTD13/yc9/+yi/+AnEyoCJRXlsyZjlP+wabKZ1gZGALZJBqOSYdorObxNDp8b7doKfUP7+wOp2RDh545ZWXrHfWYl2BdRAjqldBNjWqCnTSHRNSd1LCoIsRU957zwrWProYgKrEjg/a1qOsy0M8G2vb9mx/z65tNpkL3sdQ93c/aXH/HP6AF1isCw81AhiLDAy0qcG5r1AQ4vmEftjV57foiyFNKxT2XKpQdUsLTg6DYIbc3LQbt27ZW2+/R3rIM2mEBR7oD6fWOj2nErliB0eH9uLNWx5n2xQUYyaaQxbG5Hd+BFGMMEaFWEdw0BSoFGkukPc3STGqllTmzdDKxxdHWAPZSRxqAYrzCZVUGwFz/9YnvKWzVq17rj/Ye+D6Xe3YepbmIfhUlaWUqmoMIDvMI1pScjjq0trnp97Yi557fpcuYNuSCObFg3qIGApMUASgNsqPvPoyLPy+96aV++aTgd3YbnJzyblVLxvniALJvhiC8BwspCBeZLzOxYgUMyFEsrbeXLUbV6/ZlY11ZF9sT5/t41W6LRBl6/DMpky6SvoKQVQcUyklzIWmmhYy4VmldIzndFVUDXGt5qhcnysXSX1cixELzL+IwVwDEAoSJmrbeh99BPzOTw+scX3Vc+Klvs3oRvxQ6SnBevc/uWutkwvPw3CdtWnwiVlrwHtCzJGJLGRiImAtOIVF1d/WI0ezvkS4VHi9e/s2OXTNOxqK3Sqx3cGjm41Ve0qHIgsMpZsDYKkiRvMR6spR0VTZWSaxIh0OtX1Vl3uhwxhl3uel+yHJDG1ibQBoHtlFaJW1Bu8ROxBZVCpXsQrVBWyc4QN9oUeCNFyw6JCOhEqVLO9XaXdGdoXuJTUypNameTAMpK4gFPKoculS0KvkhJmpnzMiKLzfqNXtpU/etQqV1BK2JRuRjiIUnQyqVHOdEq7VPsfQSi9LLhG85UXA4tcFxJ4YOU8Nr+8y4h3GynF9QVUb2WGluIKSQ1OTDnOE4uaVdYvzcANiBsk8t+deuE2qeQqrkcOAhxat2lEKZ0S8ymtj0kKAZUsYoFYmH8d1VNOS+tvnPScIpaEiXlafS4vSYpNMbBtXr9vt2zepyiBC8nGZ2JtAoFeuXLF3Hzxw9oWy2SnY4v5FdEDXyUcZXZ1KeTjA0zmeenhfCwOksLyKhyzpKS95CirWCBm9ypsL7tlGnm5GazhliZTo5OTQcgPiAQjKQ1zD67KjOEX5gCCgi/jnP1iNgqBFqqnYHAmZizZYQJt4KVsZaytfi+VlMME5S6GhYvwGndAi7DGje6jJT/muxuJ6cEcVj2u3QrsUc4hua3XVJWPrnA4Fi9Ww0twpHcgIjpEUVYc1ALp5FpploeqneV7GWAlxXoTdB5AloLWLXtci9IHIc3Nz06K/7jyxGylvwrxDh7zvcBr0h8CXybFotWAC4mHMxppYOonRwHxWxuK3r19FoAN6ekzacNNjTk6tbm7jySWhzNgVmDDpDIvSs77SZIZFb8ZFoEpN/DpkJOlXJM7z1OUVUNTtDb0oiRSXLEzlaoRHvGzEsBHO0C6IGnwljKs8LUMMySZibDUQi3XVxOxhkY1OTk8tEpN1wP35/qHd3rnhi9ai1HS/oHLxkk/QJt4EE7ViLogz5dEsvSG+otJSsY14X2/4a4ZqSuXiYEwJBz1FTCrVwhirrOYbyqeGQarbO5Zhkc8ODzwE5L3Lh1rFIp7mqOmT1wLU2EtJYYKvri3Sir18CJW6Rs3+kJpbSBuxW/jiZ14FmJLIsDvfRYKfJnQPVTTAonNpWhY7I5HzlVtvigFSLAeu+CqwtfU14oQNLwYvsbAQiI3ocmQlTLC0mu5TIBijsSPUUkoXQ3lVxs2QG9eu7gCzmhcRRaqbu3dIjX/3Bt6DPyh7JGelwFZY8HoNw9EiUihIyCRJxTsfUlQytm/RcO0CA8xQelq0KiP13dqjI5BBnPNfl3Q6wyjOArr5Cdul5cKy0a7JS7xrEFlVrRXlUyV0sAxhzaxAOtL26hzrxZMRDLoASvSlMbn2mLEaOA+pb3t4qmblimIuZyubGItG4ZAatwzTaowa2nidknPv8N2Pa9rYmqQSzStJY++iypPNZsVDT+lMT8W0yky97yBqdK+MSkqJnmhuX/7yl13rq1q73EfOqCiQlwsw57Nnz+hr0w3MLycqZaUGneJHcTEBIszCShVKPIT+mKJfk+rhgQHbphP2hIfsYrTI0Uftjr1PL7hOfi3A7tlMzhrUsNUGmhvjldnA60Mo1VKVXlrdXr5/jxCC9DJFO2p17Oi0ZRfscWl+SnVSUnnNhX4K/ifWkYwY2QkSr2qx8i7QQ+RwXZ5/sxamR7gsM4LmGi0+vlgF8+3btz1/RaiSABgSoc7Yync5IFlnf3iC92UATSJlwBnsp/7xnMJCg/e1eCoqkd4rL79s2+tsr7LAzsW5500CDJSwmwhjV5GKCYtOITURzhdefc0N2KV7eQaDr8ETysEaqwz0WQ3fq8HIZ4zpMMa7GldP9zD30UO/kbH01EbC/v6+cwLIpWsAtgtr2p9R6wZNKriwqAm1qoL/Un2pQC+hjKSwPEdiMScTh5V5K0b/HmCUgNi+e/s5P0qhTa7ndp8DblmbsUB1Neidg4qeLSAwxegAghTsFwj9H929Y/8TEtXn4ceKS+8LpB3dP+Q+6obEFCQzFgqtOD/Ig/peeVmb+jKAyE1pMF8KnVswrFqldBwgqjFk02DnXKWaJ3V+KO+mpCQZQfpaN5hPuZ7BVLvO0MFj9pf67DToxoqpKQv6+Z/9KciKLRCgvrW1RfekZ0kXbyiH8WjTS1YbV8ZWv0yF/pBuhWpdNe+/+Npr9vjosVdSc74T4aVh7B6fEl5azIR0I+NpTgGKS08dq1BGkIcvVVoJzlAnVDqBFEYnH6voAgW2oFHidcggRWdm1BSxk5VF8bgmM2NRKrUErRHQHaOlJfrHxBlbPb5PdIpAyXMyoEoJt7f3yI5QYyr0J4MlaibzZa6UgXqdoZ3LI7q+e05sAlfuo61Pocr3srxWXvaz5UnNUw/tM6uxd/nQ4sfsRv6Tf/rTxPBSywuh0tUKW9IS8EU1nV8cA/zQnrt1204OjomvGh5S0HNzngkWikk/aoGqYRbzVM9KG+L4yaGlLRBpW1Ule4fHdnx6hFdIBBTUO/SdlCPVi56yn+VdFEhKKSjms0QcUalbixpZ8J2BlvWNhkNaO/p5cv6c6xYYVaysuleL4IXPJIWX2tsXNx9SDrZdThZIixIjUZT6xl8kiwguiUhnBplwjzrlmTrM+k47Alq0dDVI8fc9zk64oKdC6dNUl7GXrZkA+bbhWy3ZACaPzin/Dmnc1ezDp9+Dmav26suv4BEV6CF7PyVHlg7MfPcv/8Ji4lmncFbqdUJI5RdtVVCkh9pNblCREgvQeJqfcqyKfMlI+VwK0HUz1KzQVLNhSOiUCE0ZMuox4Wtsl3bpPZ+RnG/Nb/lihnx5+dCG15Rc7GqGxcuKsrL+jUuxLmQByW2tbzkjZxAy6nSInXdQb+8/euz3bB+17Q9O/ggRkvVi/BCFpfarDqOomChDiEWeko4ZjKltHlVSWpiOM0SElR9z4L3Gl6OEPu2KcJFfJ+dcv3UNQ6K3CcUBvJAnRBWy+i5qUF3ohnpev37d9XCFTTWRgmCnSUt1qTmQJhT4NMP0nW6gOPKbYIAIC4qFVdXE1KoiMJd3GFSPITlxBFHNgSckzj31Wx0vqsAHyEEgGeAV7SwoA2jcLIUFzWQnQjGxznFlyelKTZqv5iHjz3mvuTjqMHyDsym6poI87Wr3Q0RGepPakzhDAVFzMmCVvlQLVk1ptSyUrfmxDpRl0awiEclKpTFZVa96ZsnNATdS8/4c6deB6Y9OzugtdxEQp9bcWqfTSWMeqGpS0tiyvs5fMUOIRPV4lkNsRciREIEXRuhr7Tac0lzsInaGhBVlEeMuKzkZ8NLomp/e53TEAXjP4B05Q2wtBErdhYyjazzFirr9SAGWmiYj++jDD+0qJVqioOAGc0aZIiRkcW0wB0BJVtWPhYAxG94JbRgxPXZgkLFbUglf1z96+JFdFdSZ0CbFxQl7tYrHI3YudFhMlY7yJnMiTaF1CY9ZPCRjlDj+eMTnIU13Nt/xoq7R05t1wF4elYyak1a1a1lg93/3+VuubRS3a8jYnp25oS8XnNHxAgLF89nJ+YTq4vMIbcFWvWRgwEJVKOhVD8WNNKwknBSXmKxHB7EPTsc03CbobMWvhIcQUl2tWW1N5ytTlA5nvbjPGJHRpvnn3UUW22DvJ4+0baCntWm3utr0a0tsoov1NaYI57S17J+r6e6Nd76Dm917gqviWkce9ZBTnj5+QqjRDAR9uoc8Hk3Y+BrT6K7eeM1u3P8J26zm7I/+42/T1Os626qrqBgQZB1GwNIfGEGb44phQRXEeFxp1/DhowMQUbAXdp//2PP0mDjoFheAGv+tsu3SZk95Y2PDkZOjS6L7lEt0rajANLHhtAeB0b2cZx1J+n4OM2thil+VsNL/M9JKjrQqIVStR0jSU7jEnOmlGVRiarFLBYazemnBvvKLv2mjhM2nPucmiaVMmZwHPOU1Nc8Vs4KMCCmRxbUdz4I1CaUqqTQ16s/bPbQrxw+yJSAZ2l997w0sPnZFtcD6HAjDw5owAoTnW2+97ylLCBI8nbhARYVjRiFl3eOn+37mRKkqS2OgQkmp4gYIWQFtHRCfaD5YHU8DqBXawXkYP48BR4QLMETDd5mP9rDJ9fgqGHLKREcJVBQExG09XNj7f/i79uYP37c1diF05FZ9JuU3wWSMrAskQohDQaUPPI9abbwys9OTNrBskmZCz6cpuUbpTFudQoG4QGJBJ3jEolMYWe2jEt7X93pM9e8V9pHYu5JSUkNfO4JEGEZUTc2T/O0Qxmj6t+6VzQxAZB4SrNgW/XQV+ysrDXv44Qd+Kkgc1OuqaYhlh10SMxXSObFYATIhTHeT89AP99iH5aCaFiZyUyKfwKDMwlOH2qnSw9oHrtOh3Hnpnid4WVOVTMi+TwIERFA6fzWhMPfalGaeWF/QlOH8BB33EutXwwqeEAcQJgvSHPdeoMnz7Fo6GxOTEXJYuyCzIRUbjYCHH7xjr760aw0Ei9AljS1D4l4/qqHdTDlLR4gjbSs622FdGpiW0JUcI9UKQGibM06cHgemfevStZxzI1lbUm7GJERsupGMdcmCij9BVNpaJ3aYuV+j8lFEd859dCpWv1Pq2d7eBspq2KPMeEhcyBAqaGZ0THROTN7xpxoG8ihel7HLOgCb5u33vvN9CpBz+2+/8x+sPL2wZo1m3gjhU6W7KkMyB+13xxQ9Xh7yqVtaOa0HhBMGz9DF0HGmv//hA7u2c9U7izJMjxaqjhAoNc7ZGs2QO+Fxn6SMpzjUqRppPTXLZQj9bs7WjSRFSNzllFB5v7W1gefoMXtc6zPlesIFo6mLmpPa4ql7pBhIRwwlcfELSKNRyO926ET+79/7XeZcss999ufs/mc+Y63jh/b7//W3raB0SgO/PbjgWCKVH4aLROWCrPZgQ3AWEiedMULexnQds7a1tmF7bJNWgFR5RY0ABAJaVrLvgp1+NcRTtj4EY7WCdD/BVKf25CnFpr7T4e4Zn2ksfabrVJoyrHdGsRDIUftVB8OXfai8DA+JKUa10AxQLoImnZOeUWZ+94//zHJ4OCJP//w3XrdH/P7o5Nief+1V++q3/q2tkeb+7rt/aO0f/B8Wy30hvOD4rJMKkjokvsO+7jmtlWcHTy3/4d9SsahjMLIfvPOOXSGmh/SqzuherjeXJKPfnaGmSvS/AjoZU9LAAhmquNaiyBwuJ3U6Tr8dURxMUFn6bkSnRJ5VSVoktuVFlaCCegYSFVIUp0opQkiVzbcIL+oY1Ak7+g2csbl2xR688x51NAfY0RP/4jd+zXKVBq3Zhr386U8vkYHR5RztWv79979n4b/6rX/z7RIbUTETPTygsqHJrhg92HvPigHlG60exU8XKHsPCn0qI6j7oEa7LO4wZBFSbHARobqEsVizoN14PJalRMziIXGAxMcmOVjbs6q9c0xeHRY9tHDFuhYrAZMwvk4UZBmvezbAcJzvwHN3cQClHnmWvSm4QOdUnj07tDsv3PP2j7SDigY5RYpQxypu3LgDEUIYzNO/0F+qaHdQ57A+/9Vv2vlMJR5lHIVzGRJbg+Znfv6qan2Y7zt/8udoZzaycaW8UGRS8pAOimogxWker21zSrepQ6ucFMjSMy5iiIhFFtDhKhSUYmTUbFFxinxlsp6T2RzQ3zjkCKePHu7ZAfvRBTxVhFwe0wKKaQVXyQ4vvXjPinj4bH/fdzx09P+Nv/qeE2sinpERWfCQDmqmCKwEQT10WDvF6ltXtq0/Teynv/7rLhy0R1Qiv2kSgiw+o4gZ2L0XXuDQGX/uM4QHYDH1orXVqp6wYk8tF3lLnhrxfcjCBOfLR4UmnZTQJTPn2V+WcCgA3Qg2FtzVcn348CH7ypSOIEp/vCFu0F/U6FWGFuxfYC4ysnpZ+jMglbQfffCh/1mDdL2M6mEyQomoSPZeEBN8bveWe/UM4X7BGayf/KV/Sc+XVi7MqQMkdbVsSOYjyr4M3ZIp3520ziG2w4+PDyEsIKQe8ZqQtnSS9Yxre6Q2EpPv+2gyBaFAkMND2hDT+Uy4zdOH8ugUjwwQLI+fHPBXKdcJg5A96auEmJIS+ntl1UXNAsaXXSUzhS491I9r0BtrMSe1emUQGUeEmenDXPpjLLHmBrXx2//3gfen292Ob0h9SKn3M9/81xQlaFlq3IT91nXIAtdhvZZvm6wQR0cchnnrzbcpJFBsiIwYKdofKC0V8GKTI8MbPhlZWZWQPK1JqGjQoVXNOsWgtbWmE9TjR3veLGwA6QCGLxHTc3K/Dl9rmz7G2Cn51RMc9ymyoX9t5wp/m8SmgDKG6mpC7ft/8efO/lqf0BA8efI0zXJTWVeaWX84JfefsvE0kFIhTXU7bSqc1P7mf/wndvaICRatfK1Q6JzTGaGV2qH+rZSxKiwv8fGFL34BLqA3xUCCrP5MR59fQlC/vRT1XVBC5rEaHPHGG28wZsVT21XfdRRTI17UXIf49CqjPT044dwH7STmKhJki9qo5O39Dx7bV17/FnHOLgqmKVU4VsEmwGc++2OMQe/r57706W9XmlveWtG5Z8Ht8PDQtmmt6nAZwejwefjofVvd4bzHD95GtwJOYjlGF7MCr28RRhJVkBKkBS/oHoeHRzDoMqZapC8tuE96ahMCRfpcbQ7DqGl/cnrm4+r03fr6OjDnz+vohOistnhAJaLKTe05q1pRV/OCZsMGzUK9lxF1AFZ69RkNyLsvveLZoIcTOrR4dDxxBNmucv3/A2ToWVWNpRWsAAAAAElFTkSuQmCC';

/** Предзагруженное изображение лица — устанавливается в main.ts ДО создания OfficeView. */
export const FACE_IMG_REF = { value: null as HTMLImageElement | null };

/** Предсозданная PixiJS текстура для фото-лица — устанавливается в setTesterFace. */
export let FACE_TEXTURE_REF: Texture | null = null;
/** Храним bitmap чтобы GC не уничтожил его до загрузки на GPU. */
let _faceBitmap: ImageBitmap | null = null;

/** Фиксированный персонаж с фото-лицом (для тестировщиков).
 *  Меняй параметры ниже, чтобы настроить внешность:
 *  - skin: индекс из SKINS (0–5)
 *  - hair: индекс из HAIR_STYLES (0–11)
 *  - hairColor: индекс из HAIR_COLORS (0–7)
 *  - outfit: 'manager' — костюм, 'director' — платье директора
 *  - color: цвет футболки/костюма (hex)
 *  - pants: цвет штанов (hex)
 *  - shoes: цвет обуви (hex)
 *  - acc: аксессуары ['glasses', 'beard', 'cap', 'headphones', 'headset']
 *  - lashes: ресницы (только для женских)
 *  - fem: женский персонаж
 */
export let TESTER_LOOK: Look = {
  skin: 0,
  hair: 1,
  hairColor: 1,
  outfit: 'manager',
  color: 0x2f45a8,
  pants: 0x24358a,
  shoes: 0x262338,
  acc: [],
  lashes: false,
};

/** Установить лицо для тестировщика из HTMLImageElement. */
export async function setTesterFace(img: HTMLImageElement): Promise<void> {
  // Создаём canvas с белым фоном и рисуем фото
  const canvas = document.createElement('canvas');
  canvas.width = 60;
  canvas.height = 60;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 60, 60);
  ctx.drawImage(img, 0, 0, 60, 60);

  // Создаём ImageBitmap → текстуру PixiJS
  try {
    _faceBitmap = await createImageBitmap(canvas);
    FACE_TEXTURE_REF = Texture.from(_faceBitmap);
    console.log('Face texture created:', FACE_TEXTURE_REF?.source?.width, 'x', FACE_TEXTURE_REF?.source?.height);
  } catch (e) {
    console.error('Failed to create face texture:', e);
    FACE_TEXTURE_REF = null;
  }

  TESTER_LOOK.faceCanvas = canvas;
  console.log('TESTER_LOOK.faceCanvas set:', !!TESTER_LOOK.faceCanvas);
}

// экспорт для отладки
(window as any).__characters = { TESTER_LOOK, setTesterFace };

export type Outfit = 'support' | 'dev' | 'qa' | 'analyst' | 'sysadmin' | 'manager' | 'director';
export type Acc = 'glasses' | 'beard' | 'cap' | 'headphones' | 'headset';

export interface Look {
  skin: number;
  hair: number;
  hairColor: number;
  outfit: Outfit;
  color: number;
  pants: number;
  shoes: number;
  acc: Acc[];
  lashes?: boolean;
  /** Женский персонаж: длинные волосы, ресницы, у стоящих — юбка. */
  fem?: boolean;
  /** Предсозданный canvas для фото-лица (для PixiJS). */
  faceCanvas?: HTMLCanvasElement;
}

export const SKINS = [0xffe0bd, 0xffcf9e, 0xe8b48a, 0xc68642, 0xa86b3c, 0x7a4a2a];
export const HAIR_COLORS = [0x2a2433, 0x4a3426, 0x8a3b22, 0xe0702c, 0xf2b544, 0xd9d4cc, 0x8b6cff, 0x2fbfae];
export const HOODIES = [0x3cc774, 0xff7a45, 0x8b6cff, 0x5a6078, 0xff5fa2, 0x4fb3ff];
export const HAIR_STYLES = 12;
const LONG_HAIR = new Set([3, 4, 5, 6, 10]);

const pick = <T>(rng: () => number, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length) % xs.length];

const FEM_HAIR = [3, 4, 5, 6, 10];
const MALE_HAIR = Array.from({ length: HAIR_STYLES }, (_, i) => i).filter((i) => !LONG_HAIR.has(i));

/** Случайная внешность сотрудника отдела; fem — женщина (по имени), undefined — случайно. */
export function randomLook(rng: () => number, outfit: Outfit, fem?: boolean): Look {
  const female = fem ?? rng() < 0.5;
  const hair = female ? pick(rng, FEM_HAIR) : pick(rng, MALE_HAIR);
  const look: Look = {
    skin: pick(rng, SKINS),
    hair,
    hairColor: rng() < 0.15 ? pick(rng, HAIR_COLORS.slice(6)) : pick(rng, HAIR_COLORS.slice(0, 6)),
    outfit,
    color: 0x4fb3ff,
    pants: pick(rng, [0x3552a8, 0x454b63, 0x2f3444, 0xc9a46a, 0x6b7a4a]),
    shoes: pick(rng, [0xffffff, 0x262338, 0x8a5a33, 0x5b3d2a]),
    acc: [],
    lashes: female,
    fem: female,
  };
  switch (outfit) {
    case 'support':
      look.color = pick(rng, [0x4fb3ff, 0x7dd3fc, 0xa3e3c8]);
      look.acc.push('headset');
      break;
    case 'dev':
      look.color = pick(rng, HOODIES);
      look.pants = pick(rng, [0x3552a8, 0x2f3444, 0x454b63]);
      look.shoes = pick(rng, [0xffffff, 0xff5fa2, 0x262338]);
      if (rng() < 0.3) look.acc.push('headphones');
      break;
    case 'qa':
      look.color = pick(rng, [0xf5c542, 0xff9a6a, 0x9cd67a]);
      look.pants = pick(rng, [0xc9a46a, 0x454b63]);
      if (rng() < 0.75) look.acc.push('glasses');
      break;
    case 'analyst':
      look.color = pick(rng, [0x5b6178, 0x7b5b3a, 0x3b5b7a]);
      look.pants = 0x2f3444;
      look.shoes = 0x262338;
      if (rng() < 0.3) look.acc.push('glasses');
      break;
    case 'sysadmin':
      look.color = pick(rng, [0x6b7a8f, 0xe85d6a, 0x454b63, 0x3a7a5a]);
      look.pants = 0x6b7a4a;
      look.shoes = 0x3a2a20;
      if (rng() < 0.45 && !LONG_HAIR.has(hair)) look.acc.push('beard');
      if (rng() < 0.2) look.acc.push('cap');
      break;
    case 'manager':
      look.color = pick(rng, [0x2f45a8, 0x3b3f55, 0x6b2d3a]);
      look.pants = 0x24358a;
      look.shoes = 0x262338;
      break;
    case 'director':
      break;
  }
  if (female) look.acc = look.acc.filter((a) => a !== 'beard');
  if (look.acc.includes('beard')) look.lashes = false;
  return look;
}

/** Директор IT: длинное платье, красные туфли на каблуках, длинные волосы. */
export const DIRECTOR_LOOK: Look = {
  skin: 0xffe0bd,
  hair: 5,
  hairColor: 0x8a3b22,
  outfit: 'director',
  color: 0x3d56c4,
  pants: 0x3d56c4,
  shoes: 0xff2d3a,
  acc: [],
  lashes: true,
};

const TORSO = 'M38 120 Q38 106 52 104 L68 104 Q82 106 82 120 L84 170 L36 170 Z';

function legsG(look: Look, side: 'L' | 'R', back: boolean): Graphics {
  const g = new Graphics();
  const x = side === 'L' ? 46 : 61;
  if (look.outfit === 'director') {
    if (side === 'L') {
      rect(g, 53, 196, 3, 10, 0, { fill: 0xb5121d, line: 1.5 });
      p(g, 'M40 198 Q42 192 52 192 L58 198 L56 203 L42 203 Z', look.shoes);
    } else {
      rect(g, 76, 196, 3, 10, 0, { fill: 0xb5121d, line: 1.5 });
      p(g, 'M62 198 L68 192 Q78 192 80 198 L78 203 L64 203 Z', look.shoes);
    }
    return g;
  }
  if (look.fem && look.outfit !== 'sysadmin') {
    // юбка до колен и ноги
    rect(g, x + 3, 176, 7, 20, 3, look.skin);
    p(g, side === 'L' ? 'M44 162 L61 162 L61 182 L40 182 Z' : 'M59 162 L76 162 L80 182 L59 182 Z', back ? shade(look.pants, -0.12) : look.pants);
  } else rect(g, x, 164, 13, 32, 5, back ? shade(look.pants, -0.12) : look.pants);
  if (look.outfit === 'sysadmin') rect(g, x + 1, 174, 8, 9, 2, { fill: shade(look.pants, -0.15), line: 2 });
  rect(g, side === 'L' ? 41 : 60, back ? 192 : 190, 19, back ? 10 : 12, 6, look.shoes);
  return g;
}

function armG(look: Look, side: 'L' | 'R'): Graphics {
  const g = new Graphics();
  const x = side === 'L' ? 27 : 79;
  const hx = side === 'L' ? 34 : 86;
  const sleeve = look.outfit === 'analyst' ? 0xf4f4f8 : look.color;
  if (look.outfit === 'sysadmin') {
    rect(g, x + 1, 122, 12, 34, 6, look.skin);
    rect(g, x, 112, 14, 20, 7, sleeve);
  } else if (look.outfit === 'director') {
    rect(g, side === 'L' ? 31 : 77, 110, 12, 50, 6, sleeve);
  } else {
    rect(g, x, 112, 14, 44, 7, sleeve);
  }
  circle(g, hx, look.outfit === 'director' ? 162 : 158, look.outfit === 'director' ? 6 : 6.5, look.skin);
  return g;
}

function torsoG(look: Look, back: boolean): Graphics {
  const g = new Graphics();
  const c = look.color;
  switch (look.outfit) {
    case 'director':
      p(g, 'M44 114 Q44 104 54 102 L66 102 Q76 104 76 114 L78 136 L92 196 L28 196 L42 136 Z', back ? shade(c, -0.1) : c);
      rect(g, 41, 132, 38, 7, 2, shade(c, -0.35));
      return g;
    case 'analyst':
      p(g, TORSO, back ? c : 0xf4f4f8);
      if (!back) p(g, 'M40 112 L52 105 L60 132 L68 105 L80 112 L83 170 L37 170 Z', c);
      return g;
    case 'dev':
      p(g, TORSO, c);
      if (back) {
        p(g, 'M38 108 Q60 138 82 108 Q80 96 60 96 Q40 96 38 108 Z', shade(c, -0.18));
      } else {
        p(g, 'M47 148 L73 148 L70 160 L50 160 Z', shade(c, -0.18));
      }
      return g;
    case 'qa':
      p(g, TORSO, c);
      if (!back) {
        const s = shade(c, -0.22);
        for (const x of [49, 60, 71]) line(g, [x, 109, x, 167], s, 2.5);
        for (const y of [128, 146]) line(g, [40, y, 80, y], s, 2.5);
        stroke(g, TORSO, OUT, 3);
      }
      return g;
    default:
      p(g, TORSO, c);
      if (look.outfit === 'support' && !back) rect(g, 36, 162, 48, 7, 0, OUT);
      return g;
  }
}

/** Детали на груди — рисуются поверх шеи (воротник, галстук, бейдж). */
function chestG(look: Look): Graphics {
  const g = new Graphics();
  const c = look.color;
  switch (look.outfit) {
    case 'support':
      p(g, 'M50 104 L60 114 L70 104 Z', 0xffffff);
      break;
    case 'dev':
      p(g, 'M40 106 Q60 120 80 106 Q76 96 60 96 Q44 96 40 106 Z', shade(c, -0.18));
      line(g, [55, 112, 55, 126], 0xffffff, 2.5);
      line(g, [65, 112, 65, 126], 0xffffff, 2.5);
      break;
    case 'qa':
      p(g, 'M50 104 L60 114 L70 104 Z', c);
      break;
    case 'analyst':
      p(g, 'M50 104 L60 112 L70 104 Z', 0xf4f4f8);
      p(g, 'M57 110 L63 110 L65 138 L60 145 L55 138 Z', 0xe8173a);
      circle(g, 60, 150, 1.8, { fill: 0xffd23f, line: 1.5 });
      circle(g, 60, 160, 1.8, { fill: 0xffd23f, line: 1.5 });
      break;
    case 'sysadmin':
      stroke(g, 'M51 105 Q60 128 69 105', 0xe8173a, 2.5);
      rect(g, 53, 126, 14, 17, 2, { fill: 0xffffff, line: 2.5 });
      rect(g, 56, 130, 8, 5, 0, { fill: 0x4fb3ff, line: 0 });
      break;
    case 'manager':
      p(g, 'M50 104 L60 132 L70 104 Z', 0xffffff);
      p(g, 'M58 110 L62 110 L63 126 L60 131 L57 126 Z', { fill: 0xffd23f, line: 2 });
      rect(g, 64, 118, 15, 8, 1.5, { fill: 0xffd23f, line: 2 });
      circle(g, 60, 146, 2, { fill: OUT, line: 0 });
      circle(g, 60, 158, 2, { fill: OUT, line: 0 });
      break;
    case 'director':
      p(g, 'M53 102 L60 114 L67 102 Z', look.skin);
      circle(g, 60, 112, 2.4, { fill: 0xffd23f, line: 1.5 });
      break;
  }
  return g;
}

function neckG(look: Look): Graphics {
  const g = new Graphics();
  rect(g, look.outfit === 'director' ? 53 : 52, 88, look.outfit === 'director' ? 14 : 16, 18, 5, look.skin);
  return g;
}

/** Задняя часть причёски — за телом (вид спереди). */
function backHairG(look: Look): Graphics | null {
  const g = new Graphics();
  const c = look.hairColor;
  switch (look.hair) {
    case 3:
      p(g, 'M82 50 Q104 58 98 98 Q90 84 82 70 Z', c);
      return g;
    case 4:
      p(g, 'M28 66 Q26 102 38 106 L82 106 Q94 102 92 66 Z', c);
      return g;
    case 5:
      p(g, 'M28 68 Q24 126 40 130 L80 130 Q96 126 92 68 Z', c);
      return g;
    case 6:
      circle(g, 60, 28, 13, c);
      return g;
    case 9:
      circle(g, 60, 54, 38, c);
      return g;
    case 10:
      rect(g, 24, 62, 12, 50, 6, c);
      rect(g, 84, 62, 12, 50, 6, c);
      line(g, [25, 78, 35, 76], OUT, 2);
      line(g, [25, 92, 35, 90], OUT, 2);
      line(g, [85, 76, 95, 78], OUT, 2);
      line(g, [85, 90, 95, 92], OUT, 2);
      return g;
    default:
      return null;
  }
}

function frontHair(g: Graphics, look: Look): void {
  const c = look.hairColor;
  switch (look.hair) {
    case 0:
      p(g, 'M30 64 Q28 34 60 33 Q92 34 90 64 Q84 48 70 50 Q58 44 46 50 Q36 52 30 64 Z', c);
      break;
    case 1:
      p(g, 'M31 60 Q32 35 60 34 Q88 35 89 60 Q76 50 60 50 Q44 50 31 60 Z', c);
      break;
    case 2:
      for (const [x, y, r] of [
        [35, 58, 9],
        [85, 58, 9],
        [40, 44, 10],
        [80, 44, 10],
        [52, 36, 11],
        [68, 36, 11],
      ])
        circle(g, x, y, r, c);
      break;
    case 3:
      p(g, 'M30 64 Q30 34 60 34 Q90 34 90 64 Q80 46 60 46 Q40 46 30 64 Z', c);
      break;
    case 4:
      p(g, 'M29 72 Q27 32 60 32 Q93 32 91 72 L85 72 Q85 50 60 52 Q35 50 35 72 Z', c);
      break;
    case 5:
      p(g, 'M31 66 Q29 32 60 32 Q91 32 89 66 Q82 46 64 48 Q48 48 38 60 Z', c);
      break;
    case 6:
      p(g, 'M30 64 Q30 36 60 36 Q90 36 90 64 Q80 48 60 48 Q40 48 30 64 Z', c);
      break;
    case 7:
      p(g, 'M30.5 72 Q29 56 35 48 L40 66 Z', c);
      p(g, 'M89.5 72 Q91 56 85 48 L80 66 Z', c);
      ellipse(g, 52, 44, 8, 4, { fill: 0xffffff, alpha: 0.5, line: 0 });
      break;
    case 8:
      p(g, 'M30 66 Q26 32 60 32 Q94 32 90 62 Q70 40 40 58 Q36 60 30 66 Z', c);
      break;
    case 9:
      p(g, 'M33 60 Q36 42 60 42 Q84 42 87 60 Q74 52 60 54 Q46 52 33 60 Z', c);
      break;
    case 10:
      p(g, 'M30 64 Q30 34 60 34 Q90 34 90 64 Q76 46 60 50 Q44 46 30 64 Z', c);
      break;
    default:
      p(g, 'M32 62 Q30 40 46 30 Q60 18 80 24 Q92 30 89 60 Q80 46 62 48 Q44 46 32 62 Z', c);
  }
}

function accFront(g: Graphics, look: Look): void {
  for (const a of look.acc) {
    switch (a) {
      case 'glasses':
        circle(g, 49, 70, 9, { fill: 0xffffff, alpha: 0.25 });
        circle(g, 71, 70, 9, { fill: 0xffffff, alpha: 0.25 });
        line(g, [58, 69, 62, 69]);
        break;
      case 'beard':
        p(g, 'M31 72 Q33 102 60 104 Q87 102 89 72 Q80 88 66 86 L54 86 Q40 88 31 72 Z', look.hairColor);
        stroke(g, 'M50 84 Q60 78 70 84', OUT, 2.5);
        break;
      case 'cap':
        p(g, 'M30 60 Q30 30 60 30 Q90 30 90 60 Z', 0xff7a45);
        p(g, 'M28 60 Q60 50 102 62 Q98 70 60 64 Q36 64 28 60 Z', 0xe0602c);
        break;
      case 'headphones':
        stroke(g, 'M27 68 Q27 24 60 24 Q93 24 93 68', OUT, 7);
        stroke(g, 'M27 68 Q27 24 60 24 Q93 24 93 68', 0x8b6cff, 3);
        rect(g, 19, 56, 13, 24, 6, 0x8b6cff);
        rect(g, 88, 56, 13, 24, 6, 0x8b6cff);
        break;
      case 'headset':
        stroke(g, 'M27 68 Q27 28 60 28 Q93 28 93 68', OUT, 5);
        rect(g, 22, 60, 10, 17, 4, OUT);
        rect(g, 88, 60, 10, 17, 4, OUT);
        stroke(g, 'M28 76 Q34 90 48 88', OUT, 3);
        circle(g, 49, 88, 3.5, OUT);
        break;
    }
  }
}

function accBack(g: Graphics, look: Look): void {
  for (const a of look.acc) {
    if (a === 'cap') {
      p(g, 'M30 62 Q30 30 60 30 Q90 30 90 62 Z', 0xff7a45);
      rect(g, 50, 58, 20, 6, 3, 0xe0602c);
    } else if (a === 'headphones') {
      stroke(g, 'M27 68 Q27 24 60 24 Q93 24 93 68', OUT, 7);
      stroke(g, 'M27 68 Q27 24 60 24 Q93 24 93 68', 0x8b6cff, 3);
      rect(g, 19, 56, 13, 24, 6, 0x8b6cff);
      rect(g, 88, 56, 13, 24, 6, 0x8b6cff);
    } else if (a === 'headset') {
      stroke(g, 'M27 68 Q27 28 60 28 Q93 28 93 68', OUT, 5);
      rect(g, 22, 60, 10, 17, 4, OUT);
      rect(g, 88, 60, 10, 17, 4, OUT);
    }
  }
}

interface Rig {
  view: Container;
  legL: Container;
  legR: Container;
  bob: Container;
  armL: Container;
  armR: Container;
  torso: Container;
  head: Container;
  backHair: Container | null;
  eyes: Container | null;
  mouth: Graphics | null;
}

function wrap(g: Graphics, px: number, py: number): Container {
  const c = new Container();
  c.addChild(g);
  c.pivot.set(px, py);
  c.position.set(px, py);
  return c;
}

function buildFront(look: Look, withLegs: boolean): Rig {
  const view = new Container();
  const legL = wrap(legsG(look, 'L', false), 52, 166);
  const legR = wrap(legsG(look, 'R', false), 68, 166);
  if (withLegs) view.addChild(legL, legR);
  const bob = new Container();
  const bh = backHairG(look);
  const backHair = bh ? wrap(bh, 60, 98) : null;
  if (backHair) bob.addChild(backHair);
  const armL = wrap(armG(look, 'L'), 34, 114);
  const armR = wrap(armG(look, 'R'), 86, 114);
  const torso = wrap(torsoG(look, false), 60, 170);
  bob.addChild(armL, armR, torso, wrap(neckG(look), 60, 106), wrap(chestG(look), 60, 106));

  // === HEAD ===
  let head: Container;
  let eyes: Container | null = null;
  let mouth: Graphics | null = null;

  if (look.faceCanvas) {
    // === PHOTO FACE ===
    const headC = new Container();

    // Кожа — фон
    const skin = new Graphics();
    circle(skin, 60, 66, 30, look.skin);
    headC.addChild(skin);

    // Фото-лицо поверх кожи
    // const faceTex = FACE_TEXTURE_REF ?? Texture.from(look.faceCanvas!);
    // const faceSprite = new PixiSprite(faceTex);
    // faceSprite.width = 60;
    // faceSprite.height = 60;
    // faceSprite.anchor.set(0.5);
    // faceSprite.x = 60;
    // faceSprite.y = 66;
    // headC.addChild(faceSprite);

    // Фото-лицо поверх кожи
    const faceTex = FACE_TEXTURE_REF ?? Texture.from(look.faceCanvas!);

    // Обрезаем фото на canvas
    const maskedCanvas = document.createElement('canvas');
    const r = 32;
    maskedCanvas.width = r * 2;
    maskedCanvas.height = r * 2;
    const ctx = maskedCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, maskedCanvas.width, maskedCanvas.height);
    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(look.faceCanvas!, -7.3, -8, 60 * 0.95 + 16, 60 * 0.95 + 16);

    const faceSprite = new PixiSprite(Texture.from(maskedCanvas));
    faceSprite.anchor.set(0.5);
    faceSprite.x = 60;
    faceSprite.y = 66;
    faceSprite.width = r * 2;
    faceSprite.height = r * 2;

    headC.addChild(faceSprite);


    // Волосы, ресницы, румяна
    // const hairG = new Graphics();
    // frontHair(hairG, look);
    // // if (look.lashes) {
    // //   line(hairG, [45, 64, 42, 60], OUT, 2);
    // //   line(hairG, [75, 64, 78, 60], OUT, 2);
    // // }
    // //ellipse(hairG, 42, 79, 4.5, 4.5, { fill: 0xff8a8a, alpha: 0.5, line: 0 });
    // //ellipse(hairG, 78, 79, 4.5, 4.5, { fill: 0xff8a8a, alpha: 0.5, line: 0 });
    // headC.addChild(hairG);

    // Глаза
    // const eyesG = new Graphics();
    // ellipse(eyesG, 49, 70, 4, 5.5, { fill: OUT, line: 0 });
    // ellipse(eyesG, 71, 70, 4, 5.5, { fill: OUT, line: 0 });
    // circle(eyesG, 50.5, 67.5, 1.5, { fill: 0xffffff, line: 0 });
    // circle(eyesG, 72.5, 67.5, 1.5, { fill: 0xffffff, line: 0 });
    // eyes = wrap(eyesG, 60, 70);
    // headC.addChild(eyes!);

    // // Рот
    // const mouthG = new Graphics();
    // if (look.outfit === 'director') p(mouthG, 'M55 83 Q60 88 65 83 Q60 85 55 83 Z', { fill: 0xe8173a, line: 0 });
    // else stroke(mouthG, 'M55 84 Q60 89 65 84', OUT, 2.5);
    // mouthG.pivot.set(60, 84);
    // mouthG.position.set(60, 84);
    // mouth = mouthG;
    // headC.addChild(mouth);

    // Аксессуары
    // const accG = new Graphics();
    // accFront(accG, look);
    // headC.addChild(accG);

    head = headC;
  } else {
    // === STANDARD FACE ===
    const headG = new Graphics();
    circle(headG, 60, 66, 30, look.skin);
    frontHair(headG, look);
    if (look.lashes) {
      line(headG, [45, 64, 42, 60], OUT, 2);
      line(headG, [75, 64, 78, 60], OUT, 2);
    }
    ellipse(headG, 42, 79, 4.5, 4.5, { fill: 0xff8a8a, alpha: 0.5, line: 0 });
    ellipse(headG, 78, 79, 4.5, 4.5, { fill: 0xff8a8a, alpha: 0.5, line: 0 });
    head = wrap(headG, 60, 98);

    const eyesG = new Graphics();
    ellipse(eyesG, 49, 70, 4, 5.5, { fill: OUT, line: 0 });
    ellipse(eyesG, 71, 70, 4, 5.5, { fill: OUT, line: 0 });
    circle(eyesG, 50.5, 67.5, 1.5, { fill: 0xffffff, line: 0 });
    circle(eyesG, 72.5, 67.5, 1.5, { fill: 0xffffff, line: 0 });
    eyes = wrap(eyesG, 60, 70);
    head.addChild(eyes!);

    const mouthG = new Graphics();
    if (look.outfit === 'director') p(mouthG, 'M55 83 Q60 88 65 83 Q60 85 55 83 Z', { fill: 0xe8173a, line: 0 });
    else stroke(mouthG, 'M55 84 Q60 89 65 84', OUT, 2.5);
    mouthG.pivot.set(60, 84);
    mouthG.position.set(60, 84);
    mouth = mouthG;
    head.addChild(mouth);

    const accG = new Graphics();
    accFront(accG, look);
    head.addChild(accG);
  }

  bob.addChild(head);
  view.addChild(bob);
  return { view, legL, legR, bob, armL, armR, torso, head, backHair, eyes, mouth };
}

function buildBack(look: Look): Rig {
  const view = new Container();
  const legL = wrap(legsG(look, 'L', true), 52, 166);
  const legR = wrap(legsG(look, 'R', true), 68, 166);
  view.addChild(legL, legR);
  const bob = new Container();
  const armL = wrap(armG(look, 'L'), 34, 114);
  const armR = wrap(armG(look, 'R'), 86, 114);
  const torso = wrap(torsoG(look, true), 60, 170);
  bob.addChild(armL, armR, torso, wrap(neckG(look), 60, 106));

  const g = new Graphics();
  const c = look.hairColor;
  circle(g, 29, 72, 5.5, look.skin);
  circle(g, 60, 66, 30, look.skin);
  if (look.hair === 7) {
    p(g, 'M30 74 Q30 90 60 96 Q90 90 90 74 Q76 84 60 84 Q44 84 30 74 Z', c);
    ellipse(g, 60, 46, 10, 5, { fill: 0xffffff, alpha: 0.45, line: 0 });
  } else if (look.hair === 9) {
    circle(g, 60, 56, 38, c);
  } else {
    if (look.hair === 6) circle(g, 60, 28, 13, c);
    p(g, 'M28 70 Q24 30 60 30 Q96 30 92 70 Q90 94 60 97 Q32 94 28 70 Z', c);
    if (look.hair === 5) p(g, 'M28 68 Q24 126 40 130 L80 130 Q96 126 92 68 Z', c);
    if (look.hair === 4) p(g, 'M28 66 Q26 102 38 106 L82 106 Q94 102 92 66 Z', c);
    if (look.hair === 3) p(g, 'M52 88 Q60 128 68 88 Z', c);
    if (look.hair === 10) {
      rect(g, 40, 80, 11, 44, 5, c);
      rect(g, 69, 80, 11, 44, 5, c);
    }
    if (look.hair === 2) for (const x of [40, 60, 80]) circle(g, x, 40, 11, c);
    stroke(g, 'M50 48 Q58 42 66 48', shade(c, 0.25), 2.5);
  }
  accBack(g, look);
  const head = wrap(g, 60, 98);
  bob.addChild(head);
  view.addChild(bob);
  return { view, legL, legR, bob, armL, armR, torso, head, backHair: null, eyes: null, mouth: null };
}

/** drink — стоит с кружкой и отпивает; game — сидит с геймпадом; repair — руки заняты (чинит, моет руки). */
export type Mode = 'idle' | 'walk' | 'sit' | 'repair' | 'talk' | 'drink' | 'game';
/** Направление: 0 — вправо-вниз, 1 — влево-вниз, 2 — вправо-вверх, 3 — влево-вверх. */
export type Dir = 0 | 1 | 2 | 3;

const DEG = Math.PI / 180;

/** Персонаж: контейнер с ногами в (0,0) мира. Масштаб задаёт владелец. */
export class Character {
  readonly root = new Container();
  mode: Mode = 'idle';
  /** Скорость анимации (на «Аврале» печатают быстрее). */
  speed = 1;
  private front: Rig;
  private back: Rig | null = null;
  private readonly shadow = new Graphics();
  private dir: Dir = 0;
  private phase: number;
  private breath: number;
  private blinkIn: number;

  constructor(
    readonly look: Look,
    private readonly rng: () => number,
    readonly seated = false,
  ) {
    this.phase = rng() * Math.PI * 2;
    this.breath = rng() * Math.PI * 2;
    this.blinkIn = 1 + rng() * 4;
    this.root.pivot.set(60, 204);
    if (!seated) {
      ellipse(this.shadow, 60, 208, 28, 6, { fill: OUT, alpha: 0.2, line: 0 });
      this.root.addChild(this.shadow);
    }
    this.front = buildFront(look, !seated);
    this.root.addChild(this.front.view);
    if (seated) this.mode = 'sit';
  }

  setDir(dir: Dir): void {
    if (dir === this.dir) return;
    this.dir = dir;
    const backView = dir >= 2;
    if (backView && !this.back) {
      this.back = buildBack(this.look);
      this.root.addChild(this.back.view);
    }
    this.front.view.visible = !backView;
    if (this.back) this.back.view.visible = backView;
    // зеркалим влево
    const flip = dir === 1 || dir === 3 ? -1 : 1;
    this.front.view.scale.x = flip;
    this.front.view.x = flip < 0 ? 120 : 0;
    if (this.back) {
      this.back.view.scale.x = flip;
      this.back.view.x = flip < 0 ? 120 : 0;
    }
  }

  private mugC: Container | null = null;
  private armIdx = -1;
  private padG: Graphics | null = null;

  /** Что в руках: кружка (пьёт кофе), геймпад (играет) или ничего. */
  hold(prop: 'mug' | 'pad' | null): void {
    if (prop === 'mug' && !this.mugC) {
      const c = new Container();
      const g = new Graphics();
      rect(g, 80, 146, 14, 15, 3, 0xffffff);
      p(g, 'M94 150 Q101 153 94 157', { fill: 0xffffff, line: 2.5 });
      ellipse(g, 87, 146, 7, 2.5, { fill: 0x7a4a22, line: 2 });
      c.addChild(g);
      c.pivot.set(86, 158);
      c.position.set(86, 158);
      this.front.armR.addChild(c);
      this.mugC = c;
    }
    if (prop === 'pad' && !this.padG) {
      const g = new Graphics();
      rect(g, 44, 140, 32, 13, 6, 0x2f3344);
      circle(g, 52, 146, 2.5, { fill: 0x4fb3ff, line: 0 });
      circle(g, 68, 146, 2.5, { fill: 0xe8173a, line: 0 });
      this.front.bob.addChild(g);
      this.padG = g;
    }
    if (this.mugC) this.mugC.visible = prop === 'mug';
    if (this.padG) this.padG.visible = prop === 'pad';
    const bob = this.front.bob;
    const arm = this.front.armR;
    if (this.armIdx < 0) this.armIdx = bob.getChildIndex(arm);
    bob.removeChild(arm);
    // с кружкой рука поверх головы: кружка подносится ко рту перед лицом, а не за затылком
    if (prop === 'mug') bob.addChild(arm);
    else bob.addChildAt(arm, Math.min(this.armIdx, bob.children.length));
  }

  /** Спрятать свои руки (за столом их рисует рабочее место — руки на клавиатуре). */
  hideArms(): void {
    this.front.armL.visible = false;
    this.front.armR.visible = false;
  }

  /** Повернуть лицо на 3/4: глаза и рот сдвигаются в сторону взгляда (px в координатах рисунка). */
  turnFace(px: number): void {
    for (const c of [this.front.eyes, this.front.mouth]) if (c) c.x += px;
  }

  private rig(): Rig {
    return this.dir >= 2 && this.back ? this.back : this.front;
  }

  update(dt: number): void {
    const r = this.rig();
    this.breath += dt * ((Math.PI * 2) / 3.4);
    const b = (1 - Math.cos(this.breath)) / 2; // 0..1 мягко
    // моргание
    this.blinkIn -= dt;
    if (r.eyes) {
      if (this.blinkIn < 0) {
        r.eyes.scale.y = 0.1;
        if (this.blinkIn < -0.12) this.blinkIn = 2.5 + this.rng() * 3.5;
      } else r.eyes.scale.y = 1;
    }

    const reset = (): void => {
      r.legL.rotation = r.legR.rotation = 0;
      r.legL.y = r.legL.pivot.y;
      r.legR.y = r.legR.pivot.y;
      r.armL.rotation = r.armR.rotation = 0;
      r.bob.y = 0;
      this.front.view.rotation = 0;
    };

    if (this.mode === 'walk') {
      this.phase += dt * ((Math.PI * 2) / 0.9) * this.speed;
      const ph = this.phase;
      const lift = (x: number): number => Math.max(0, Math.sin(x));
      r.legL.y = r.legL.pivot.y - 6 * lift(ph);
      r.legR.y = r.legR.pivot.y - 6 * lift(ph + Math.PI);
      r.legL.rotation = 5 * DEG * Math.cos(ph);
      r.legR.rotation = 5 * DEG * Math.cos(ph + Math.PI);
      r.armL.rotation = 14 * DEG * Math.sin(ph + Math.PI);
      r.armR.rotation = 14 * DEG * Math.sin(ph);
      r.bob.y = -3 * ((1 - Math.cos(2 * ph)) / 2);
      r.head.rotation = 2.5 * DEG * Math.sin(ph - 0.6);
      r.head.y = r.head.pivot.y;
      r.torso.scale.y = 1;
      this.shadow.scale.x = 1 - 0.1 * ((1 - Math.cos(2 * ph)) / 2);
      this.root.rotation = 1.5 * DEG * Math.sin(ph);
    } else {
      reset();
      this.root.rotation = 0;
      this.shadow.scale.x = 1;
      r.torso.scale.y = 1 + 0.025 * b;
      r.head.y = r.head.pivot.y - 2.3 * b;
      r.head.rotation = 1.5 * DEG * b;
      if (this.mode === 'sit') {
        this.phase += dt * 2.4 * this.speed;
        r.head.rotation = 3 * DEG * Math.sin(this.phase * 0.4);
      } else if (this.mode === 'repair') {
        this.phase += dt * 7 * this.speed;
        r.armR.rotation = -40 * DEG + 18 * DEG * Math.sin(this.phase);
        r.armL.rotation = -10 * DEG + 6 * DEG * Math.sin(this.phase * 0.5);
      } else if (this.mode === 'drink') {
        // держит кружку у груди, раз в несколько секунд подносит ко рту
        this.phase += dt;
        const cyc = this.phase % 5.2;
        const sip = cyc < 1.5 ? Math.sin((cyc / 1.5) * Math.PI) : 0;
        r.armR.rotation = 0.95 + 1.35 * sip;
        r.head.rotation = -6 * DEG * sip;
        if (this.mugC) this.mugC.rotation = -r.armR.rotation + 0.35 * sip;
      } else if (this.mode === 'game') {
        // жмёт кнопки геймпада
        this.phase += dt * 9 * this.speed;
        r.armR.rotation = 0.95 + 0.07 * Math.sin(this.phase);
        r.armL.rotation = -0.95 - 0.07 * Math.sin(this.phase * 1.3);
        r.head.rotation = 2 * DEG * Math.sin(this.phase * 0.2);
      } else if (this.mode === 'talk') {
        this.phase += dt * 10;
        if (r.mouth) r.mouth.scale.y = 1 + 0.4 * Math.max(0, Math.sin(this.phase));
        r.armR.rotation = -20 * DEG * (0.5 + 0.5 * Math.sin(this.phase * 0.3));
      }
    }
    if (r.backHair) {
      r.backHair.rotation = r.head.rotation;
      r.backHair.y = r.head.y;
    }
  }
}
