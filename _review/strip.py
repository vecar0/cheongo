from PIL import Image
TS=[.06,.14,.24,.36,.48,.62,.78,.92]
for w in (844,390):
  ims=[Image.open(f'shots/wipe_{w}_{t}.png') for t in TS]; sc=.4 if w==844 else .3
  ims=[i.resize((int(i.width*sc),int(i.height*sc))) for i in ims]
  cols=4; rows=2; out=Image.new('RGB',(cols*(ims[0].width+4),rows*(ims[0].height+4)),'white')
  for k,i in enumerate(ims): out.paste(i,((k%cols)*(i.width+4),(k//cols)*(i.height+4)))
  out.save(f'shots/wipe_strip_{w}.png')
