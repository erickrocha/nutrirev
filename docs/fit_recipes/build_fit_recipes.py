#!/usr/bin/env python3
"""Gera backend/migration/data/fit_recipes*.csv (receitas fit globais, sem tenant).

Ingredientes: `t<id>` = id da TACO (taco_ingredients.csv), `u<id>` = fdc_id do USDA (usda_sr_legacy.csv).
Quantidades são da receita inteira; `portion` é o número de porções. Unidades: Grams, Ml, TableSpoon (15 g),
TeaSpoon (5 g). Restrições e tags de nutrição são deduzidas dos ingredientes, nada é digitado à mão.
Uso: python3 docs/fit_recipes/build_fit_recipes.py
"""
import csv, os, sys

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'migration', 'data')
G, ML, TBSP, TSP = 'Grams', 'Ml', 'TableSpoon', 'TeaSpoon'
GRAM = {G: 1, ML: 1, TBSP: 15, TSP: 5}

# ── ingredientes usados ─────────────────────────────────────────────────────────────────────────
MEAT = {409, 410, 408, 376, 317, 316, 301, 302, 284, 277, 425}          # carnes e peixes (TACO)
DAIRY = {448, 449, 457, 458, 461, 463, 464, 469, 262, 'u170894', 'u167703', 'u173177'}
EGG = {489, 488, 486, 'u172183'}
GLUTEN = {7, 52, 63, 513, 518}                                    # aveia, pão, torrada, fermento, shoyu
HONEY = {507}
ANIMAL = MEAT | DAIRY | EGG | HONEY

def key(ref):
    return int(ref[1:]) if ref[0] == 't' else 'u' + ref[1:]

# ── receitas ────────────────────────────────────────────────────────────────────────────────────
# (nome, refeições, tempo_min, porções, descrição, [(ref, qtd, unidade)], [passos])
R = []
def rec(name, meals, minutes, portion, desc, ings, steps):
    R.append((name, meals, minutes, portion, desc, ings, steps))

CAFE, LANCHE, ALMOCO, JANTAR, SOBR = 'Café da manhã', 'Lanche', 'Almoço', 'Jantar', 'Sobremesa'

rec('Panqueca de banana e aveia', [CAFE], 15, 2,
    'Panqueca de três ingredientes, sem farinha branca nem açúcar: a banana adoça e a aveia dá fibras.',
    [('t182', 200, G), ('t489', 100, G), ('t7', 40, G), ('u171320', 2, G), ('t260', 1, TSP)],
    ['Amasse as bananas com um garfo até virar um purê.', 'Misture os ovos, a aveia e a canela até obter uma massa homogênea.',
     'Aqueça uma frigideira antiaderente com o azeite e despeje porções da massa.', 'Doure 2 minutos de cada lado e sirva com frutas.'])
rec('Omelete de espinafre e queijo minas', [CAFE, JANTAR], 10, 1,
    'Omelete alto em proteína, com folhas verdes e queijo branco.',
    [('t489', 150, G), ('u168462', 40, G), ('t461', 40, G), ('t157', 50, G), ('t260', 1, TSP)],
    ['Bata os ovos com uma pitada de sal e pimenta.', 'Pique o espinafre e o tomate e corte o queijo em cubos.',
     'Aqueça o azeite em uma frigideira, despeje os ovos e distribua o recheio.', 'Dobre ao meio quando firmar e sirva quente.'])
rec('Overnight oats com chia e morango', [CAFE], 5, 1,
    'Aveia hidratada na geladeira durante a noite: pronta para levar ao trabalho.',
    [('t7', 40, G), ('u170894', 120, G), ('t457', 100, ML), ('u170554', 10, G), ('t239', 80, G), ('t507', 1, TSP)],
    ['Em um pote, misture a aveia, a chia, o iogurte e o leite.', 'Tampe e deixe na geladeira por no mínimo 6 horas.',
     'Pela manhã, cubra com o morango picado e o mel.'])
rec('Tapioca de cottage com tomate', [CAFE, LANCHE], 10, 1,
    'Tapioca leve e sem glúten, recheada com queijo cottage.',
    [('t124', 40, G), ('u167703', 60, G), ('t157', 50, G)],
    ['Aqueça uma frigideira antiaderente e espalhe a fécula formando um disco.', 'Quando a goma se unir, vire por alguns segundos.',
     'Recheie com o cottage e o tomate em cubos e dobre.'])
rec('Crepioca de frango', [CAFE, LANCHE], 10, 1,
    'Mistura de ovo e tapioca com recheio de frango desfiado e ricota.',
    [('t489', 50, G), ('t124', 20, G), ('t410', 60, G), ('t469', 20, G)],
    ['Bata o ovo com a fécula e uma pitada de sal.', 'Despeje em frigideira antiaderente e deixe firmar dos dois lados.',
     'Recheie com o frango desfiado e a ricota amassada e dobre.'])
rec('Mingau proteico de aveia e banana', [CAFE], 10, 1,
    'Mingau cremoso com whey, ótimo antes do treino.',
    [('t7', 40, G), ('t457', 200, ML), ('u173177', 25, G), ('t182', 50, G), ('u171320', 1, G)],
    ['Cozinhe a aveia no leite em fogo baixo por 5 minutos, mexendo sempre.', 'Retire do fogo e espere amornar um pouco.',
     'Misture o whey até dissolver e finalize com a banana em rodelas e a canela.'])
rec('Ovo mexido com abacate no pão integral', [CAFE], 10, 1,
    'Gorduras boas do abacate com proteína do ovo e fibras do pão integral.',
    [('t52', 50, G), ('t489', 100, G), ('t163', 50, G), ('t157', 40, G), ('t260', 1, TSP)],
    ['Toste as fatias de pão.', 'Mexa os ovos com o azeite em fogo baixo até ficarem cremosos.',
     'Amasse o abacate sobre o pão, cubra com o ovo e o tomate picado.'])
rec('Smoothie verde de abacaxi e couve', [CAFE, LANCHE], 5, 1,
    'Bebida refrescante, hidratante e rica em fibras.',
    [('t115', 30, G), ('t164', 100, G), ('t222', 80, G), ('t219', 15, ML), ('t478', 200, ML)],
    ['Lave bem a couve e retire o talo.', 'Bata todos os ingredientes no liquidificador até ficar liso.', 'Sirva imediatamente, com gelo se quiser.'])
rec('Iogurte com granola caseira e mamão', [CAFE, LANCHE], 5, 1,
    'Granola simples de aveia, castanha e linhaça sobre iogurte e fruta.',
    [('t449', 170, G), ('t7', 20, G), ('t589', 10, G), ('t594', 5, G), ('t507', 5, G), ('t225', 80, G)],
    ['Pique a castanha em pedaços pequenos.', 'Toste a aveia, a castanha e a linhaça em frigideira seca por 3 minutos.',
     'Monte o iogurte em uma tigela, cubra com o mamão, a granola e o mel.'])
rec('Muffin de ovo com legumes', [CAFE, LANCHE], 30, 2,
    'Muffins salgados sem farinha, perfeitos para preparar no domingo e congelar.',
    [('t489', 250, G), ('t71', 60, G), ('t110', 40, G), ('t145', 40, G), ('t107', 20, G), ('t463', 40, G)],
    ['Pré-aqueça o forno a 180 °C e unte forminhas de muffin.', 'Pique todos os legumes bem miúdos.',
     'Bata os ovos com sal, misture os legumes e o queijo ralado.', 'Distribua nas forminhas e asse por 20 minutos.'])
rec('Cuscuz nordestino com ovo e queijo minas', [CAFE], 10, 1,
    'Café da manhã tradicional, saciante e com pouca gordura.',
    [('t533', 150, G), ('t489', 100, G), ('t461', 30, G)],
    ['Aqueça o cuscuz já cozido no vapor.', 'Prepare os ovos mexidos ou cozidos.', 'Sirva o cuscuz com o ovo e o queijo minas em cubos.'])

rec('Frango grelhado com arroz integral e brócolis', [ALMOCO, JANTAR], 25, 1,
    'O prato clássico fit: proteína magra, carboidrato complexo e legume.',
    [('t410', 150, G), ('t1', 120, G), ('t100', 80, G), ('t260', 1, TSP)],
    ['Tempere o filé de frango com alho, sal e limão.', 'Grelhe em frigideira antiaderente por 5 minutos de cada lado.',
     'Cozinhe o brócolis no vapor por 5 minutos.', 'Sirva com o arroz integral e um fio de azeite.'])
rec('Strogonoff fit de frango', [ALMOCO, JANTAR], 30, 4,
    'Versão leve com iogurte natural no lugar do creme de leite.',
    [('t409', 400, G), ('t107', 80, G), ('u169251', 150, G), ('t82', 10, G), ('t158', 30, G), ('t448', 120, G), ('t260', 1, TBSP)],
    ['Corte o frango em cubos e tempere com sal e pimenta.', 'Refogue a cebola e o alho no azeite, junte o frango e doure.',
     'Acrescente os cogumelos fatiados e o extrato de tomate e cozinhe por 10 minutos.', 'Desligue o fogo e misture o iogurte aos poucos para não talhar.'])
rec('Escondidinho de batata-doce com carne moída', [ALMOCO, JANTAR], 45, 4,
    'Purê de batata-doce sobre recheio de carne magra, gratinado com mozarela.',
    [('t88', 500, G), ('t376', 400, G), ('t107', 100, G), ('t159', 150, G), ('t82', 10, G), ('t260', 1, TBSP), ('t463', 80, G)],
    ['Amasse a batata-doce cozida e tempere com sal.', 'Refogue a cebola e o alho no azeite, junte a carne moída e cozinhe até secar.',
     'Adicione o molho de tomate e deixe apurar por 5 minutos.', 'Monte em camadas: carne, purê e queijo.', 'Leve ao forno a 200 °C por 15 minutos para gratinar.'])
rec('Salada de quinoa com grão-de-bico', [ALMOCO], 20, 3,
    'Salada fria completa, boa para marmita.',
    [('u168917', 300, G), ('u173757', 150, G), ('t142', 100, G), ('t157', 150, G), ('t153', 10, G), ('t219', 30, ML), ('t260', 2, TBSP)],
    ['Cozinhe a quinoa e o grão-de-bico (ou use cozidos) e deixe esfriar.', 'Pique o pepino, o tomate e a salsa.',
     'Misture tudo e tempere com limão, azeite e sal.'])
rec('Bowl de salmão com arroz e legumes', [ALMOCO, JANTAR], 20, 1,
    'Bowl inspirado na culinária japonesa, rico em ômega-3.',
    [('t317', 120, G), ('t1', 100, G), ('t142', 50, G), ('t110', 40, G), ('t518', 5, G), ('t593', 3, G), ('t163', 40, G)],
    ['Grelhe o salmão e quebre em lascas.', 'Monte o arroz no fundo de uma tigela.',
     'Distribua o pepino e a cenoura em tiras, o abacate fatiado e o salmão.', 'Finalize com shoyu e gergelim.'])
rec('Almôndegas de patinho ao molho de tomate', [ALMOCO, JANTAR], 35, 4,
    'Almôndegas assadas, sem fritura, com aveia no lugar da farinha de rosca.',
    [('t376', 500, G), ('t489', 50, G), ('t7', 30, G), ('t107', 60, G), ('t82', 8, G), ('t159', 300, G), ('t153', 5, G)],
    ['Misture a carne, o ovo, a aveia, a cebola e o alho picados, sal e salsa.', 'Modele bolinhas e coloque em assadeira.',
     'Asse a 200 °C por 20 minutos, virando na metade.', 'Aqueça o molho de tomate, junte as almôndegas e cozinhe por 5 minutos.'])
rec('Lentilha com legumes e ovo cozido', [ALMOCO], 30, 2,
    'Prato vegetariano rico em ferro e fibras.',
    [('t577', 300, G), ('t109', 100, G), ('t107', 60, G), ('t157', 100, G), ('t82', 5, G), ('t260', 1, TBSP), ('t488', 100, G)],
    ['Refogue a cebola e o alho no azeite.', 'Junte a cenoura em cubos e o tomate e cozinhe por 5 minutos.',
     'Acrescente a lentilha cozida e um pouco de água e deixe apurar.', 'Sirva com os ovos cozidos cortados ao meio.'])
rec('Merluza assada com legumes', [ALMOCO, JANTAR], 35, 2,
    'Peixe branco assado na própria assadeira com legumes.',
    [('t302', 400, G), ('t71', 150, G), ('t157', 150, G), ('t107', 80, G), ('t260', 2, TSP), ('t219', 20, ML)],
    ['Tempere a merluza com limão, sal e pimenta.', 'Corte os legumes em rodelas e disponha em uma assadeira.',
     'Coloque o peixe por cima, regue com o azeite e cubra com papel alumínio.', 'Asse a 200 °C por 25 minutos.'])
rec('Panqueca integral de frango com ricota', [ALMOCO, JANTAR], 40, 3,
    'Massa de aveia e ovo recheada com frango, coberta com molho de tomate.',
    [('t489', 100, G), ('t7', 50, G), ('t457', 120, ML), ('t410', 200, G), ('t469', 80, G), ('t159', 150, G)],
    ['Bata no liquidificador o ovo, a aveia e o leite.', 'Faça discos finos em frigideira antiaderente.',
     'Misture o frango desfiado com a ricota e recheie os discos.', 'Enrole, cubra com o molho e aqueça no forno por 10 minutos.'])
rec('Arroz de couve-flor com frango', [ALMOCO, JANTAR], 30, 3,
    'Low carb: a couve-flor ralada substitui o arroz.',
    [('t117', 400, G), ('t409', 300, G), ('t110', 50, G), ('t107', 50, G), ('t82', 8, G), ('t260', 1, TBSP)],
    ['Rale ou processe a couve-flor até ficar do tamanho de grãos de arroz.', 'Refogue o frango em cubos com cebola e alho até dourar.',
     'Junte a cenoura ralada e a couve-flor e refogue por 5 minutos.', 'Acerte o sal e sirva.'])
rec('Hambúrguer caseiro com batata-doce assada', [ALMOCO, JANTAR], 40, 3,
    'Hambúrguer de patinho sem pão, acompanhado de batata-doce e salada.',
    [('t376', 360, G), ('t107', 40, G), ('t82', 5, G), ('t88', 300, G), ('t79', 60, G), ('t157', 120, G)],
    ['Misture a carne com cebola, alho, sal e pimenta e modele três hambúrgueres.', 'Corte a batata-doce cozida em palitos e asse a 200 °C por 20 minutos.',
     'Grelhe os hambúrgueres 4 minutos de cada lado.', 'Sirva com alface e tomate.'])
rec('Camarão com espaguete de abobrinha', [ALMOCO, JANTAR], 20, 2,
    'Massa de abobrinha com camarão e tomate: leve e rápido.',
    [('t284', 300, G), ('t71', 400, G), ('t157', 150, G), ('t82', 10, G), ('t260', 1, TBSP), ('t153', 5, G)],
    ['Corte a abobrinha em tiras finas, como espaguete.', 'Doure o alho no azeite e refogue o camarão por 3 minutos.',
     'Junte o tomate picado e cozinhe até desmanchar.', 'Acrescente a abobrinha por 2 minutos e finalize com salsa.'])
rec('Salada de atum com feijão branco', [ALMOCO, LANCHE], 10, 2,
    'Salada fria e proteica, de preparo rápido.',
    [('t565', 200, G), ('t277', 120, G), ('t107', 30, G), ('t157', 100, G), ('t153', 5, G), ('t260', 1, TSP), ('t219', 15, ML)],
    ['Escorra bem o atum.', 'Misture o feijão, o tomate e a cebola picados.', 'Junte o atum e tempere com azeite, limão, sal e salsa.'])
rec('Frango xadrez fit', [ALMOCO, JANTAR], 30, 3,
    'Frango salteado com pimentões e castanha de caju.',
    [('t409', 400, G), ('t144', 80, G), ('t145', 80, G), ('t107', 80, G), ('t518', 15, G), ('t42', 10, G), ('t260', 1, TBSP), ('t588', 20, G)],
    ['Corte o frango em cubos e envolva no amido de milho.', 'Doure no azeite em fogo alto e reserve.',
     'Salteie a cebola e os pimentões em tiras por 3 minutos.', 'Volte o frango, junte o shoyu e a castanha e misture por 2 minutos.'])
rec('Frango desfiado com purê de batata-doce', [ALMOCO, JANTAR], 25, 1,
    'Marmita simples para o pós-treino.',
    [('t408', 150, G), ('t88', 200, G), ('t100', 80, G), ('t260', 1, TSP)],
    ['Amasse a batata-doce cozida com sal e o azeite.', 'Desfie o frango cozido e aqueça com um pouco de água.', 'Sirva com o brócolis cozido no vapor.'])

rec('Sopa de abóbora com frango desfiado', [JANTAR], 30, 3,
    'Sopa cremosa sem creme de leite, que fica saciante com a proteína do frango.',
    [('t64', 400, G), ('t107', 60, G), ('t82', 5, G), ('t408', 150, G), ('t260', 1, TBSP)],
    ['Refogue a cebola e o alho no azeite.', 'Junte a abóbora cozida e 500 ml de água e cozinhe por 10 minutos.',
     'Bata no liquidificador até ficar cremoso.', 'Volte à panela, adicione o frango desfiado e aqueça.'])
rec('Caldo verde fit', [JANTAR], 35, 3,
    'Versão leve do caldo verde, sem linguiça e com frango.',
    [('t92', 300, G), ('t115', 80, G), ('t107', 80, G), ('t82', 5, G), ('t408', 150, G), ('t260', 1, TBSP)],
    ['Cozinhe a batata com cebola e alho em 800 ml de água até ficar macia.', 'Bata parte do caldo no liquidificador e devolva à panela.',
     'Junte a couve cortada bem fina e o frango desfiado.', 'Cozinhe por 5 minutos e finalize com o azeite.'])
rec('Omelete de forno com brócolis e ricota', [JANTAR, ALMOCO], 30, 2,
    'Omelete assado, firme e fácil de dividir.',
    [('t489', 250, G), ('t100', 150, G), ('t469', 100, G), ('t107', 30, G), ('t464', 15, G)],
    ['Pré-aqueça o forno a 180 °C.', 'Bata os ovos com sal, misture o brócolis picado, a cebola e a ricota esfarelada.',
     'Despeje em forma untada, polvilhe o parmesão e asse por 25 minutos.'])
rec('Filé de frango com purê de couve-flor', [JANTAR, ALMOCO], 30, 2,
    'Purê low carb com textura cremosa.',
    [('t409', 300, G), ('t118', 400, G), ('t262', 10, G), ('t82', 5, G)],
    ['Tempere e grelhe os filés de frango.', 'Bata a couve-flor cozida com manteiga, alho e sal até formar um purê.', 'Sirva o frango sobre o purê.'])
rec('Berinjela recheada com carne moída', [JANTAR, ALMOCO], 45, 2,
    'Berinjelas assadas recheadas com carne e queijo.',
    [('t96', 500, G), ('t376', 250, G), ('t107', 60, G), ('t157', 150, G), ('t463', 60, G), ('t82', 5, G), ('t260', 1, TBSP)],
    ['Corte as berinjelas ao meio e asse a 200 °C por 20 minutos.', 'Retire a polpa e pique.',
     'Refogue cebola, alho, carne, a polpa e o tomate.', 'Recheie, cubra com mozarela e gratine por 10 minutos.'])
rec('Salmão assado com aspargos e batata-doce', [JANTAR, ALMOCO], 30, 2,
    'Jantar completo em uma única assadeira.',
    [('t316', 300, G), ('u168389', 200, G), ('t88', 200, G), ('t219', 20, ML), ('t260', 2, TSP)],
    ['Tempere o salmão com limão, sal e pimenta.', 'Disponha na assadeira com os aspargos e a batata-doce cozida em fatias.',
     'Regue com o azeite e asse a 200 °C por 15 minutos.'])
rec('Torta de frango de liquidificador', [JANTAR, ALMOCO], 50, 4,
    'Massa de aveia batida no liquidificador, sem farinha de trigo.',
    [('t489', 150, G), ('t457', 200, ML), ('t7', 80, G), ('t410', 250, G), ('t157', 100, G), ('t107', 40, G), ('t513', 5, G), ('t260', 1, TBSP)],
    ['Bata os ovos, o leite, a aveia e o azeite no liquidificador.', 'Junte o fermento e misture sem bater.',
     'Misture o frango desfiado, o tomate e a cebola picados.', 'Alterne massa e recheio em forma untada e asse a 180 °C por 35 minutos.'])
rec('Estrogonofe de tofu e cogumelos', [JANTAR, ALMOCO], 30, 3,
    'Opção vegana, cremosa graças ao leite de coco.',
    [('t584', 300, G), ('u169251', 300, G), ('t107', 80, G), ('t158', 30, G), ('t518', 15, G), ('t523', 100, ML), ('t260', 1, TBSP), ('t82', 5, G)],
    ['Corte o tofu em cubos e doure no azeite.', 'Refogue a cebola e o alho e junte os cogumelos fatiados.',
     'Acrescente o extrato de tomate, o shoyu e o tofu.', 'Adicione o leite de coco e cozinhe por 5 minutos.'])

rec('Cookies de aveia e banana', [LANCHE], 25, 6,
    'Cookies sem açúcar nem farinha, adoçados pela banana.',
    [('t182', 200, G), ('t7', 100, G), ('u172470', 30, G), ('u171320', 2, G)],
    ['Amasse as bananas e misture com a aveia, a pasta de amendoim e a canela.', 'Modele 12 bolinhas e achate em assadeira forrada.',
     'Asse a 180 °C por 15 minutos.'])
rec('Homus caseiro com palitos de cenoura', [LANCHE], 10, 3,
    'Pasta de grão-de-bico com tahine, boa para lanches da tarde.',
    [('u173757', 200, G), ('u168604', 30, G), ('t219', 30, ML), ('t82', 5, G), ('t260', 1, TBSP), ('t110', 150, G)],
    ['Bata o grão-de-bico, o tahine, o limão, o alho e o azeite com um pouco de água.', 'Corte a cenoura em palitos.', 'Sirva o homus com os palitos.'])
rec('Bolo de caneca de banana e cacau', [LANCHE, SOBR], 5, 1,
    'Bolo individual no micro-ondas, pronto em 2 minutos.',
    [('t182', 80, G), ('t489', 50, G), ('t7', 30, G), ('u169593', 5, G), ('t513', 2, G)],
    ['Amasse a banana em uma caneca e misture o ovo.', 'Junte a aveia, o cacau e o fermento.', 'Leve ao micro-ondas por 90 segundos.'])
rec('Guacamole fit com palitos de pepino', [LANCHE], 10, 3,
    'Pasta de abacate com tomate e limão.',
    [('t163', 200, G), ('t157', 60, G), ('t107', 20, G), ('t219', 20, ML), ('t153', 5, G), ('t142', 200, G)],
    ['Amasse o abacate com o limão.', 'Misture o tomate e a cebola picados bem miúdos e a salsa.', 'Acerte o sal e sirva com pepino em palitos.'])
rec('Ovos cozidos recheados', [LANCHE], 20, 2,
    'Gemas misturadas com iogurte e mostarda no lugar da maionese.',
    [('t488', 200, G), ('t449', 60, G), ('u172234', 5, G), ('t153', 3, G)],
    ['Corte os ovos cozidos ao meio e retire as gemas.', 'Amasse as gemas com o iogurte, a mostarda e o sal.', 'Recheie as claras e finalize com salsa.'])
rec('Chips de batata-doce assada', [LANCHE], 35, 2,
    'Crocantes e assados, sem fritura.',
    [('t89', 300, G), ('t260', 2, TSP)],
    ['Fatie a batata-doce em rodelas muito finas.', 'Misture com o azeite e sal e espalhe em assadeira.', 'Asse a 180 °C por 25 minutos, virando na metade.'])
rec('Iogurte batido com mamão e linhaça', [LANCHE, CAFE], 5, 1,
    'Lanche rápido e rico em fibras.',
    [('t449', 170, G), ('t225', 120, G), ('t594', 8, G)],
    ['Bata o iogurte com o mamão no liquidificador.', 'Sirva com a linhaça por cima.'])
rec('Torrada integral com ricota e tomate', [LANCHE], 5, 1,
    'Lanche simples e leve.',
    [('t52', 50, G), ('t469', 50, G), ('t157', 60, G), ('t133', 3, G)],
    ['Toste o pão.', 'Espalhe a ricota e cubra com o tomate fatiado.', 'Finalize com manjericão e uma pitada de sal.'])

rec('Mousse de abacate com cacau', [SOBR], 10, 2,
    'Sobremesa cremosa, sem açúcar refinado.',
    [('t163', 200, G), ('u169593', 15, G), ('t507', 20, G), ('t457', 60, ML)],
    ['Bata todos os ingredientes no liquidificador até ficar liso.', 'Distribua em taças e leve à geladeira por 1 hora.'])
rec('Sorvete de banana e morango', [SOBR], 10, 2,
    'Sorvete de fruta congelada, sem açúcar, leite ou creme.',
    [('t182', 200, G), ('t239', 150, G)],
    ['Congele as bananas em rodelas e o morango por 3 horas.', 'Bata no processador até ficar cremoso.', 'Sirva na hora.'])
rec('Pudim de chia com manga', [SOBR, CAFE], 5, 1,
    'Pudim feito na geladeira, rico em fibras e ômega-3.',
    [('u170554', 30, G), ('u174832', 200, ML), ('t231', 100, G), ('t507', 5, G)],
    ['Misture a chia, o leite de amêndoa e o mel.', 'Mexa de novo depois de 5 minutos para não empelotar.', 'Leve à geladeira por 4 horas e cubra com a manga em cubos.'])
rec('Brigadeiro fit de whey e cacau', [SOBR], 15, 6,
    'Docinho proteico, sem leite condensado.',
    [('u173177', 60, G), ('u169593', 10, G), ('t457', 60, ML)],
    ['Misture o whey e o cacau.', 'Acrescente o leite aos poucos até formar uma massa que desgrude das mãos.', 'Leve à geladeira por 30 minutos, modele 6 bolinhas.'])
rec('Vitamina pós-treino de banana com whey', [LANCHE], 5, 1,
    'Shake de recuperação com carboidrato e proteína.',
    [('u173177', 30, G), ('t182', 100, G), ('t457', 250, ML), ('t7', 20, G), ('u172470', 10, G)],
    ['Bata todos os ingredientes no liquidificador.', 'Consuma até 1 hora depois do treino.'])
rec('Panqueca de claras com mirtilo', [CAFE, LANCHE], 10, 1,
    'Quase só proteína, com mirtilos por cima.',
    [('u172183', 180, G), ('t7', 30, G), ('u171711', 50, G), ('t507', 5, G)],
    ['Bata as claras com a aveia.', 'Doure em frigideira antiaderente dos dois lados.', 'Sirva com os mirtilos e o mel.'])
rec('Bolo de laranja fit', [SOBR, LANCHE], 50, 8,
    'Bolo de liquidificador com aveia e suco de laranja.',
    [('t489', 150, G), ('t215', 150, ML), ('t7', 120, G), ('t507', 40, G), ('t513', 10, G), ('t260', 2, TBSP)],
    ['Bata o ovo, o suco, o mel e o azeite.', 'Junte a aveia e bata mais um pouco; adicione o fermento sem bater.', 'Asse em forma untada a 180 °C por 35 minutos.'])
rec('Salada de frutas com iogurte e chia', [SOBR, CAFE], 10, 2,
    'Frutas frescas com iogurte e sementes.',
    [('t225', 150, G), ('t236', 150, G), ('t239', 100, G), ('t214', 100, G), ('t449', 170, G), ('u170554', 10, G)],
    ['Corte as frutas em cubos.', 'Misture com o iogurte.', 'Finalize com a chia.'])

assert len(R) == 50, len(R)

# ── dados nutricionais ──────────────────────────────────────────────────────────────────────────
def load(path, idcol):
    with open(os.path.join(ROOT, path), newline='') as f:
        return {r[idcol]: r for r in csv.DictReader(f)}
taco, usda = load('taco_ingredients.csv', 'taco_id'), load('usda_sr_legacy.csv', 'fdc_id')
def food(ref):
    row = (taco if ref[0] == 't' else usda).get(ref[1:])
    if row is None:
        sys.exit(f'ingrediente inexistente: {ref}')
    return row

rows_r, rows_i, rows_d, report = [], [], [], []
for n, (name, meals, minutes, portion, desc, ings, steps) in enumerate(R, 1):
    code = f'fit{n:02d}'
    kcal = prot = carb = fat = 0.0
    keys = set()
    for ref, qty, unit in ings:
        row, grams = food(ref), qty * GRAM[unit]
        kcal += float(row['kcal'] or 0) * grams / 100
        prot += float(row['protein'] or 0) * grams / 100
        carb += float(row['carbs'] or 0) * grams / 100
        fat += float(row['fat'] or 0) * grams / 100
        keys.add(key(ref))
        rows_i.append([code, ref[1:] if ref[0] == 't' else '', ref[1:] if ref[0] == 'u' else '', qty, unit])
    per = [round(v / portion) for v in (kcal, prot, carb, fat)]
    tags = ['Fit']
    if per[1] >= 25: tags.append('Alto em proteína')
    if per[2] <= 20: tags.append('Low carb')
    if minutes <= 15: tags.append('Rápido')
    restr = []
    if not keys & MEAT: restr.append('Vegetariano')
    if not keys & ANIMAL: restr.append('Vegano')
    if not keys & DAIRY: restr.append('Sem lactose')
    if not keys & GLUTEN: restr.append('Sem glúten')
    rows_r.append([code, name, desc, minutes, portion, ';'.join(meals), ';'.join(tags), ';'.join(restr)])
    rows_d += [[code, i, s] for i, s in enumerate(steps, 1)]
    report.append((n, name, portion, *per, ';'.join(restr)))

def write(path, header, rows):
    with open(os.path.join(ROOT, path), 'w', newline='') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(header); w.writerows(rows)
write('fit_recipes.csv', ['code', 'name', 'description', 'time', 'portion', 'meals', 'tags', 'restrictions'], rows_r)
write('fit_recipe_ingredients.csv', ['code', 'taco_id', 'fdc_id', 'quantity', 'unit'], rows_i)
write('fit_recipe_directions.csv', ['code', 'step_number', 'description'], rows_d)
print(f"{'#':>2} {'receita':44} {'por':>3} {'kcal':>5} {'P':>4} {'C':>4} {'G':>4}  restrições")
for r in report: print(f'{r[0]:>2} {r[1][:44]:44} {r[2]:>3} {r[3]:>5} {r[4]:>4} {r[5]:>4} {r[6]:>4}  {r[7]}')
